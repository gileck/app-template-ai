#!/usr/bin/env tsx
/**
 * Technical Design Agent
 *
 * Generates Technical Design documents for GitHub Project items.
 *
 * Flow A (New Design):
 *   - Fetches items in "Technical Design" status with empty Review Status
 *   - Reads the approved Product Design from issue body
 *   - Generates technical design using Claude (read-only mode)
 *   - Updates issue body with design
 *   - Sets Review Status to "Waiting for Review"
 *
 * Flow B (Address Feedback):
 *   - Fetches items in "Technical Design" with Review Status = "Request Changes"
 *   - Reads admin feedback comments
 *   - Revises technical design based on feedback
 *   - Updates issue body with revised design
 *   - Sets Review Status back to "Waiting for Review"
 *
 * Usage:
 *   yarn agent:tech-design                    # Process all pending
 *   yarn agent:tech-design --id <item-id>     # Process specific item
 *   yarn agent:tech-design --dry-run          # Preview without saving
 *   yarn agent:tech-design --stream           # Stream Claude output
 */

import 'dotenv/config';
import { Command } from 'commander';
import {
    // Config
    STATUSES,
    REVIEW_STATUSES,
    agentConfig,
    // Project management
    getProjectManagementAdapter,
    type ProjectItem,
    // Claude
    runAgent,
    extractMarkdown,
    extractOriginalDescription,
    extractProductDesign,
    extractTechDesign,
    buildUpdatedIssueBody,
    // Notifications
    notifyTechDesignReady,
    notifyAgentError,
    notifyBatchComplete,
    notifyAgentStarted,
    // Prompts
    buildTechDesignPrompt,
    buildTechDesignRevisionPrompt,
    // Types
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
    options: CommonCLIOptions,
    adapter: Awaited<ReturnType<typeof getProjectManagementAdapter>>
): Promise<{ success: boolean; error?: string }> {
    const { item, mode } = processable;
    const content = item.content;

    if (!content || content.type !== 'Issue') {
        return { success: false, error: 'Item has no linked issue' };
    }

    const issueNumber = content.number!;
    console.log(`\n  Processing issue #${issueNumber}: ${content.title}`);
    console.log(`  Mode: ${mode === 'new' ? 'New Design' : 'Address Feedback'}`);

    // Send "work started" notification
    if (!options.dryRun) {
        await notifyAgentStarted('Technical Design', content.title, issueNumber, mode);
    }

    try {
        // Extract product design (optional - may be skipped for internal/technical work)
        const productDesign = extractProductDesign(content.body);

        // Always fetch comments - they provide context for any phase
        const comments = await adapter.getIssueComments(issueNumber);
        const issueComments = comments.map((c) => ({
            id: c.id,
            body: c.body,
            author: c.author,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        }));
        if (issueComments.length > 0) {
            console.log(`  Found ${issueComments.length} comment(s) on issue`);
        }

        let prompt: string;

        if (mode === 'new') {
            // Flow A: New design
            prompt = buildTechDesignPrompt(content, productDesign, issueComments);
        } else {
            // Flow B: Address feedback
            const existingTechDesign = extractTechDesign(content.body);
            if (!existingTechDesign) {
                return { success: false, error: 'No existing technical design found to revise' };
            }

            if (issueComments.length === 0) {
                return { success: false, error: 'No feedback comments found' };
            }

            prompt = buildTechDesignRevisionPrompt(content, productDesign, existingTechDesign, issueComments);
        }

        // Run the agent
        console.log('');
        const result = await runAgent({
            prompt,
            stream: options.stream,
            verbose: options.verbose,
            timeout: options.timeout,
            progressLabel: mode === 'new' ? 'Generating technical design' : 'Revising technical design',
        });

        if (!result.success || !result.content) {
            const error = result.error || 'No content generated';
            if (!options.dryRun) {
                await notifyAgentError('Technical Design', content.title, issueNumber, error);
            }
            return { success: false, error };
        }

        // Extract markdown design from output
        const design = extractMarkdown(result.content);
        if (!design) {
            const error = 'Could not extract design document from output';
            if (!options.dryRun) {
                await notifyAgentError('Technical Design', content.title, issueNumber, error);
            }
            return { success: false, error };
        }

        console.log(`  Design generated: ${design.length} chars`);
        console.log(`  Preview: ${design.slice(0, 100).replace(/\n/g, ' ')}...`);

        if (options.dryRun) {
            console.log('  [DRY RUN] Would update issue body');
            console.log('  [DRY RUN] Would set Review Status to Waiting for Review');
            console.log('  [DRY RUN] Would send notification');
            return { success: true };
        }

        // Update issue body (preserve product design)
        const originalDescription = extractOriginalDescription(content.body);
        const newBody = buildUpdatedIssueBody(originalDescription, productDesign, design);
        await adapter.updateIssueBody(issueNumber, newBody);
        console.log('  Issue body updated');

        // Update review status (status stays at "Technical Design")
        if (adapter.hasReviewStatusField()) {
            await adapter.updateItemReviewStatus(item.id, REVIEW_STATUSES.waitingForReview);
            console.log(`  Review Status updated to: ${REVIEW_STATUSES.waitingForReview}`);
        }

        // Send notification
        await notifyTechDesignReady(content.title, issueNumber, mode === 'feedback');
        console.log('  Notification sent');

        return { success: true };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`  Error: ${errorMsg}`);
        if (!options.dryRun) {
            await notifyAgentError('Technical Design', content.title, issueNumber, errorMsg);
        }
        return { success: false, error: errorMsg };
    }
}

async function main(): Promise<void> {
    const program = new Command();

    program
        .name('tech-design')
        .description('Generate Technical Design documents for GitHub Project items')
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
        timeout: (opts.timeout as number | undefined) ?? agentConfig.claude.timeoutSeconds,
        dryRun: Boolean(opts.dryRun),
        verbose: Boolean(opts.verbose),
        stream: Boolean(opts.stream),
    };

    console.log('\n========================================');
    console.log('  Technical Design Agent');
    console.log('========================================');
    console.log(`  Timeout: ${options.timeout}s per item`);
    if (options.dryRun) {
        console.log('  Mode: DRY RUN (no changes will be saved)');
    }
    console.log('');

    // Initialize project management adapter
    console.log('Connecting to GitHub...');
    const adapter = getProjectManagementAdapter();
    await adapter.init();

    // Collect items to process
    const itemsToProcess: ProcessableItem[] = [];

    if (options.id) {
        // Process specific item
        console.log(`\nFetching item: ${options.id}`);
        const item = await adapter.getItem(options.id);
        if (!item) {
            console.error(`Item not found: ${options.id}`);
            process.exit(1);
        }

        // Determine mode based on current status and review status
        let mode: 'new' | 'feedback';
        if (item.status === STATUSES.techDesign && !item.reviewStatus) {
            mode = 'new';
        } else if (item.status === STATUSES.techDesign && item.reviewStatus === REVIEW_STATUSES.requestChanges) {
            mode = 'feedback';
        } else {
            console.error(`Item is not in a processable state.`);
            console.error(`  Status: ${item.status}`);
            console.error(`  Review Status: ${item.reviewStatus}`);
            console.error(`  Expected: "${STATUSES.techDesign}" with empty Review Status or Review Status "${REVIEW_STATUSES.requestChanges}"`);
            process.exit(1);
        }

        itemsToProcess.push({ item, mode });
    } else {
        // Flow A: Fetch items ready for new design (Technical Design status with empty Review Status)
        console.log(`\nFetching items in "${STATUSES.techDesign}" with empty Review Status...`);
        const allTechDesignItems = await adapter.listItems({ status: STATUSES.techDesign, limit: options.limit || 50 });
        const newItems = allTechDesignItems.filter((item) => !item.reviewStatus);
        for (const item of newItems) {
            itemsToProcess.push({ item, mode: 'new' });
        }
        console.log(`  Found ${newItems.length} item(s) for new design`);

        // Flow B: Fetch items needing revision (Technical Design status with Request Changes)
        if (adapter.hasReviewStatusField()) {
            console.log(`\nFetching items with Review Status "${REVIEW_STATUSES.requestChanges}"...`);
            const feedbackItems = allTechDesignItems.filter(
                (item) => item.reviewStatus === REVIEW_STATUSES.requestChanges
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

        const result = await processItem(processable, options, adapter);

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
        await notifyBatchComplete('Technical Design', results.processed, results.succeeded, results.failed);
    }
}

// Run
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
