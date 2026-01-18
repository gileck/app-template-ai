#!/usr/bin/env tsx
/**
 * Product Design Agent
 *
 * Generates Product Design documents for GitHub Project items.
 *
 * Flow A (New Design):
 *   - Fetches items in "Ready for Product Design" status
 *   - Generates product design using Claude (read-only mode)
 *   - Updates issue body with design
 *   - Moves to "Product Design Review" status
 *   - Sets Review Status to "Waiting for Review"
 *
 * Flow B (Address Feedback):
 *   - Fetches items in "Product Design Review" with Review Status = "Request Changes"
 *   - Reads admin feedback comments
 *   - Revises product design based on feedback
 *   - Updates issue body with revised design
 *   - Sets Review Status back to "Waiting for Review"
 *
 * Usage:
 *   yarn agent:product-design                    # Process all pending
 *   yarn agent:product-design --id <item-id>     # Process specific item
 *   yarn agent:product-design --dry-run          # Preview without saving
 *   yarn agent:product-design --stream           # Stream Claude output
 */

import 'dotenv/config';
import { Command } from 'commander';
import {
    // Config
    STATUSES,
    REVIEW_STATUSES,
    config,
    // GitHub
    initGitHub,
    listProjectItems,
    getProjectItem,
    updateProjectItemStatus,
    updateProjectItemReviewStatus,
    updateIssueBody,
    getIssueComments,
    hasReviewStatusField,
    // Claude
    runAgent,
    extractMarkdown,
    extractOriginalDescription,
    extractProductDesign,
    buildUpdatedIssueBody,
    // Notifications
    notifyProductDesignReady,
    notifyAgentError,
    notifyBatchComplete,
    // Prompts
    buildProductDesignPrompt,
    buildProductDesignRevisionPrompt,
    // Types
    type ProjectItem,
    type CommonCLIOptions,
    type UsageStats,
} from './shared';

// ============================================================
// TYPES
// ============================================================

interface ProcessableItem {
    item: ProjectItem;
    mode: 'new' | 'feedback';
}

// ============================================================
// MAIN LOGIC
// ============================================================

async function processItem(
    processable: ProcessableItem,
    options: CommonCLIOptions
): Promise<{ success: boolean; error?: string }> {
    const { item, mode } = processable;
    const content = item.content;

    if (!content || content.type !== 'Issue') {
        return { success: false, error: 'Item has no linked issue' };
    }

    const issueNumber = content.number!;
    console.log(`\n  Processing issue #${issueNumber}: ${content.title}`);
    console.log(`  Mode: ${mode === 'new' ? 'New Design' : 'Address Feedback'}`);

    try {
        let prompt: string;
        let feedbackComments: Array<{ id: number; body: string; author: string; createdAt: string; updatedAt: string }> = [];

        if (mode === 'new') {
            // Flow A: New design
            prompt = buildProductDesignPrompt(content);
        } else {
            // Flow B: Address feedback
            const existingDesign = extractProductDesign(content.body);
            if (!existingDesign) {
                return { success: false, error: 'No existing product design found to revise' };
            }

            // Fetch feedback comments
            feedbackComments = await getIssueComments(issueNumber);
            if (feedbackComments.length === 0) {
                return { success: false, error: 'No feedback comments found' };
            }

            prompt = buildProductDesignRevisionPrompt(content, existingDesign, feedbackComments);
        }

        // Run the agent
        console.log('');
        const result = await runAgent({
            prompt,
            stream: options.stream,
            verbose: options.verbose,
            timeout: options.timeout,
            progressLabel: mode === 'new' ? 'Generating product design' : 'Revising product design',
        });

        if (!result.success || !result.content) {
            const error = result.error || 'No content generated';
            if (!options.dryRun) {
                await notifyAgentError('Product Design', content.title, issueNumber, error);
            }
            return { success: false, error };
        }

        // Extract markdown design from output
        const design = extractMarkdown(result.content);
        if (!design) {
            const error = 'Could not extract design document from output';
            if (!options.dryRun) {
                await notifyAgentError('Product Design', content.title, issueNumber, error);
            }
            return { success: false, error };
        }

        console.log(`  Design generated: ${design.length} chars`);
        console.log(`  Preview: ${design.slice(0, 100).replace(/\n/g, ' ')}...`);

        if (options.dryRun) {
            console.log('  [DRY RUN] Would update issue body');
            console.log('  [DRY RUN] Would update status to Product Design Review');
            console.log('  [DRY RUN] Would set Review Status to Waiting for Review');
            console.log('  [DRY RUN] Would send notification');
            return { success: true };
        }

        // Update issue body
        const originalDescription = extractOriginalDescription(content.body);
        const existingTechDesign = null; // Product design doesn't touch tech design
        const newBody = buildUpdatedIssueBody(originalDescription, design, existingTechDesign);
        await updateIssueBody(issueNumber, newBody);
        console.log('  Issue body updated');

        // Update status if new design
        if (mode === 'new') {
            await updateProjectItemStatus(item.id, STATUSES.productDesignReview);
            console.log(`  Status updated to: ${STATUSES.productDesignReview}`);
        }

        // Update review status
        if (hasReviewStatusField()) {
            await updateProjectItemReviewStatus(item.id, REVIEW_STATUSES.waitingForReview);
            console.log(`  Review Status updated to: ${REVIEW_STATUSES.waitingForReview}`);
        }

        // Send notification
        await notifyProductDesignReady(content.title, issueNumber, mode === 'feedback');
        console.log('  Notification sent');

        return { success: true };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`  Error: ${errorMsg}`);
        if (!options.dryRun) {
            await notifyAgentError('Product Design', content.title, issueNumber, errorMsg);
        }
        return { success: false, error: errorMsg };
    }
}

async function main(): Promise<void> {
    const program = new Command();

    program
        .name('product-design')
        .description('Generate Product Design documents for GitHub Project items')
        .option('--id <itemId>', 'Process a specific project item by ID')
        .option('--limit <number>', 'Limit number of items to process', parseInt)
        .option('--timeout <seconds>', 'Timeout per item in seconds', parseInt)
        .option('--dry-run', 'Preview without saving changes', false)
        .option('--stream', "Stream Claude's output in real-time", false)
        .option('--verbose', 'Show additional debug output', false)
        .parse(process.argv);

    const opts = program.opts();
    const options: CommonCLIOptions = {
        id: opts.id as string | undefined,
        limit: opts.limit as number | undefined,
        timeout: (opts.timeout as number | undefined) ?? config.claude.timeoutSeconds,
        dryRun: Boolean(opts.dryRun),
        verbose: Boolean(opts.verbose),
        stream: Boolean(opts.stream),
    };

    console.log('\n========================================');
    console.log('  Product Design Agent');
    console.log('========================================');
    console.log(`  Timeout: ${options.timeout}s per item`);
    if (options.dryRun) {
        console.log('  Mode: DRY RUN (no changes will be saved)');
    }
    console.log('');

    // Initialize GitHub connection
    console.log('Connecting to GitHub...');
    await initGitHub();

    // Collect items to process
    const itemsToProcess: ProcessableItem[] = [];

    if (options.id) {
        // Process specific item
        console.log(`\nFetching item: ${options.id}`);
        const item = await getProjectItem(options.id);
        if (!item) {
            console.error(`Item not found: ${options.id}`);
            process.exit(1);
        }

        // Determine mode based on current status
        let mode: 'new' | 'feedback';
        if (item.status === STATUSES.readyForProductDesign) {
            mode = 'new';
        } else if (item.status === STATUSES.productDesignReview && item.reviewStatus === REVIEW_STATUSES.requestChanges) {
            mode = 'feedback';
        } else {
            console.error(`Item is not in a processable state.`);
            console.error(`  Status: ${item.status}`);
            console.error(`  Review Status: ${item.reviewStatus}`);
            console.error(`  Expected: "${STATUSES.readyForProductDesign}" or "${STATUSES.productDesignReview}" with Review Status "${REVIEW_STATUSES.requestChanges}"`);
            process.exit(1);
        }

        itemsToProcess.push({ item, mode });
    } else {
        // Flow A: Fetch items ready for new design
        console.log(`\nFetching items in "${STATUSES.readyForProductDesign}"...`);
        const newItems = await listProjectItems(STATUSES.readyForProductDesign, undefined, options.limit || 50);
        for (const item of newItems) {
            itemsToProcess.push({ item, mode: 'new' });
        }
        console.log(`  Found ${newItems.length} item(s) for new design`);

        // Flow B: Fetch items needing revision
        if (hasReviewStatusField()) {
            console.log(`\nFetching items with Review Status "${REVIEW_STATUSES.requestChanges}"...`);
            const feedbackItems = await listProjectItems(
                STATUSES.productDesignReview,
                REVIEW_STATUSES.requestChanges,
                options.limit || 50
            );
            for (const item of feedbackItems) {
                itemsToProcess.push({ item, mode: 'feedback' });
            }
            console.log(`  Found ${feedbackItems.length} item(s) needing revision`);
        }

        // Apply limit
        if (options.limit && itemsToProcess.length > options.limit) {
            itemsToProcess.length = options.limit;
        }
    }

    if (itemsToProcess.length === 0) {
        console.log('\nNo items to process.');
        return;
    }

    console.log(`\nProcessing ${itemsToProcess.length} item(s)...`);

    // Track results
    const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        totalUsage: {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
            totalCostUSD: 0,
        } as UsageStats,
    };

    // Process each item
    for (const processable of itemsToProcess) {
        results.processed++;
        const { item } = processable;
        const title = item.content?.title || 'Unknown';

        console.log(`\n----------------------------------------`);
        console.log(`[${results.processed}/${itemsToProcess.length}] ${title}`);
        console.log(`  Item ID: ${item.id}`);
        console.log(`  Status: ${item.status}`);
        if (item.reviewStatus) {
            console.log(`  Review Status: ${item.reviewStatus}`);
        }

        const result = await processItem(processable, options);

        if (result.success) {
            results.succeeded++;
        } else {
            results.failed++;
            console.error(`  Failed: ${result.error}`);
        }
    }

    // Print summary
    console.log('\n========================================');
    console.log('  Summary');
    console.log('========================================');
    console.log(`  Processed: ${results.processed}`);
    console.log(`  Succeeded: ${results.succeeded}`);
    console.log(`  Failed: ${results.failed}`);
    console.log('========================================\n');

    // Send batch completion notification
    if (!options.dryRun && results.processed > 1) {
        await notifyBatchComplete('Product Design', results.processed, results.succeeded, results.failed);
    }
}

// Run
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
