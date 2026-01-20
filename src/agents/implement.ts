#!/usr/bin/env tsx
/**
 * Implementation Agent
 *
 * Implements features and creates Pull Requests for GitHub Project items.
 *
 * Flow A (New Implementation):
 *   - Fetches items in "Implementation" status with empty Review Status
 *   - Creates a feature branch
 *   - Runs Claude agent with implementation prompt (WRITE mode)
 *   - Commits and pushes changes
 *   - Creates PR linking to issue
 *   - Sets Review Status to "Waiting for Review"
 *
 * Flow B (Address Feedback):
 *   - Fetches items in "Implementation" with Review Status = "Request Changes"
 *   - Reads PR review comments
 *   - Runs Claude agent to address feedback (WRITE mode)
 *   - Commits and pushes changes
 *   - Sets Review Status back to "Waiting for Review"
 *
 * Usage:
 *   yarn agent:implement                    # Process all pending
 *   yarn agent:implement --id <item-id>     # Process specific item
 *   yarn agent:implement --dry-run          # Preview without changes
 *   yarn agent:implement --stream           # Stream Claude output
 */

import 'dotenv/config';
import { execSync } from 'child_process';
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
    extractProductDesign,
    extractTechDesign,
    // Notifications
    notifyPRReady,
    notifyAgentError,
    notifyBatchComplete,
    notifyAgentStarted,
    // Prompts
    buildImplementationPrompt,
    buildPRRevisionPrompt,
    // Types
    type CommonCLIOptions,
    type GitHubComment,
} from './shared';

// ============================================================
// TYPES
// ============================================================

interface ProcessableItem {
    item: ProjectItem;
    mode: 'new' | 'feedback';
    prNumber?: number;
}

interface ImplementOptions extends CommonCLIOptions {
    skipPush?: boolean;
}

// ============================================================
// GIT UTILITIES
// ============================================================

/**
 * Execute a git command and return the output
 */
function git(command: string, options: { cwd?: string; silent?: boolean } = {}): string {
    try {
        const result = execSync(`git ${command}`, {
            cwd: options.cwd || process.cwd(),
            encoding: 'utf-8',
            stdio: options.silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
        });
        return result.trim();
    } catch (error) {
        if (error instanceof Error && 'stderr' in error) {
            throw new Error((error as { stderr: string }).stderr || error.message);
        }
        throw error;
    }
}

/**
 * Get the current branch name
 */
function getCurrentBranch(): string {
    return git('rev-parse --abbrev-ref HEAD', { silent: true });
}

/**
 * Check if there are uncommitted changes
 */
function hasUncommittedChanges(): boolean {
    const status = git('status --porcelain', { silent: true });
    return status.length > 0;
}

/**
 * Checkout a branch (create if doesn't exist)
 */
function checkoutBranch(branchName: string, createFromDefault: boolean = false): void {
    if (createFromDefault) {
        const defaultBranch = git('symbolic-ref refs/remotes/origin/HEAD --short', { silent: true }).replace('origin/', '');
        git(`checkout -b ${branchName} origin/${defaultBranch}`);
    } else {
        git(`checkout ${branchName}`);
    }
}

/**
 * Generate a branch name from issue number and title
 */
function generateBranchName(issueNumber: number, title: string): string {
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);
    return `feature/issue-${issueNumber}-${slug}`;
}

/**
 * Commit all changes with a message
 */
function commitChanges(message: string): void {
    git('add -A');
    // Use single quotes and escape them properly to avoid shell injection
    const escapedMessage = message.replace(/'/g, "'\\''");
    git(`commit -m '${escapedMessage}'`);
}

/**
 * Push current branch to origin
 */
function pushBranch(branchName: string, force: boolean = false): void {
    const forceFlag = force ? '--force-with-lease' : '';
    git(`push -u origin ${branchName} ${forceFlag}`.trim());
}

/**
 * Pull latest from a branch
 */
function pullBranch(branchName: string): void {
    git(`pull origin ${branchName} --rebase`);
}

/**
 * Run yarn checks and return results
 */
function runYarnChecks(): { success: boolean; output: string } {
    try {
        const output = execSync('yarn checks', {
            encoding: 'utf-8',
            stdio: 'pipe',
            timeout: 120000,
        });
        return { success: true, output };
    } catch (error) {
        const err = error as { stdout?: string; stderr?: string; message?: string };
        return {
            success: false,
            output: (err.stdout || '') + (err.stderr || '') || err.message || String(error),
        };
    }
}

/**
 * Get list of changed files (staged or unstaged)
 */
function getChangedFiles(): string[] {
    try {
        const output = git('diff --name-only HEAD', { silent: true });
        return output.split('\n').filter((f) => f.trim());
    } catch {
        return [];
    }
}

// ============================================================
// MAIN LOGIC
// ============================================================

async function processItem(
    processable: ProcessableItem,
    options: ImplementOptions,
    adapter: Awaited<ReturnType<typeof getProjectManagementAdapter>>
): Promise<{ success: boolean; prNumber?: number; error?: string }> {
    const { item, mode } = processable;
    const content = item.content;

    if (!content || content.type !== 'Issue') {
        return { success: false, error: 'Item has no linked issue' };
    }

    const issueNumber = content.number!;
    console.log(`\n  Processing issue #${issueNumber}: ${content.title}`);
    console.log(`  Mode: ${mode === 'new' ? 'New Implementation' : 'Address Feedback'}`);

    // Send "work started" notification
    if (!options.dryRun) {
        await notifyAgentStarted('Implementation', content.title, issueNumber, mode);
    }

    const originalBranch = getCurrentBranch();
    const branchName = generateBranchName(issueNumber, content.title);

    try {
        // Check for uncommitted changes
        if (hasUncommittedChanges()) {
            return { success: false, error: 'Uncommitted changes in working directory. Please commit or stash them first.' };
        }

        // Extract designs from issue body (optional - may be skipped for simple/internal work)
        const productDesign = extractProductDesign(content.body);
        const techDesign = extractTechDesign(content.body);

        if (!techDesign && !productDesign) {
            console.log('  Note: No design documents found - implementing from issue description only');
        } else if (!techDesign) {
            console.log('  Note: No technical design found - implementing from product design and issue description');
        } else if (!productDesign) {
            console.log('  Note: No product design found - implementing from technical design only (internal work)');
        }

        // Always fetch issue comments - they provide context for any phase
        const allIssueComments = await adapter.getIssueComments(issueNumber);
        const issueComments: GitHubComment[] = allIssueComments.map((c) => ({
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
        let prReviewComments: Array<{ path?: string; line?: number; body: string; author: string }> = [];

        if (mode === 'new') {
            // Flow A: New implementation
            // Check if branch already exists
            const branchExistsRemotely = await adapter.branchExists(branchName);
            if (branchExistsRemotely) {
                console.log(`  Branch ${branchName} already exists, will use it`);
            }

            prompt = buildImplementationPrompt(content, productDesign, techDesign, branchName, issueComments);
        } else {
            // Flow B: Address feedback
            if (!processable.prNumber) {
                return { success: false, error: 'No PR number available for feedback mode' };
            }

            // Fetch PR review comments (inline code comments)
            const prReviewCommentsRaw = await adapter.getPRReviewComments(processable.prNumber);
            prReviewComments = prReviewCommentsRaw.map((c) => ({
                path: c.path,
                line: c.line,
                body: c.body,
                author: c.author,
            }));

            // Fetch PR conversation comments (general comments on the PR)
            const prConversationComments = await adapter.getPRComments(processable.prNumber);
            const prComments: GitHubComment[] = prConversationComments.map((c) => ({
                id: c.id,
                body: c.body,
                author: c.author,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
            }));

            const totalFeedback = issueComments.length + prReviewComments.length + prComments.length;
            if (totalFeedback === 0) {
                return { success: false, error: 'No feedback comments found' };
            }

            console.log(`  Found ${issueComments.length} issue comments, ${prComments.length} PR comments, ${prReviewComments.length} PR review comments`);

            // Combine issue comments and PR comments for the prompt
            const allComments = [...issueComments, ...prComments];
            prompt = buildPRRevisionPrompt(content, productDesign, techDesign, allComments, prReviewComments);
        }

        // Checkout the feature branch
        console.log(`  Checking out branch: ${branchName}`);
        const branchExistsLocally = git('branch --list ' + branchName, { silent: true }).length > 0;

        if (mode === 'new' && !branchExistsLocally) {
            checkoutBranch(branchName, true);
        } else {
            checkoutBranch(branchName, false);
            if (mode === 'feedback') {
                // Pull latest changes
                try {
                    pullBranch(branchName);
                } catch {
                    console.log('  Note: Could not pull from remote (branch may not exist remotely yet)');
                }
            }
        }

        // Run pre-work yarn checks (informational only)
        if (!options.dryRun) {
            console.log('  Running pre-work yarn checks...');
            const preChecks = runYarnChecks();
            if (!preChecks.success) {
                console.log('  ⚠️ Pre-existing issues found (continuing anyway)');
            } else {
                console.log('  ✅ Codebase is clean');
            }
        }

        // Run the agent (WRITE mode)
        console.log('');
        const result = await runAgent({
            prompt,
            stream: options.stream,
            verbose: options.verbose,
            timeout: options.timeout,
            progressLabel: mode === 'new' ? 'Implementing feature' : 'Addressing feedback',
            allowWrite: true, // Enable write mode
        });

        if (!result.success) {
            const error = result.error || 'Implementation failed';
            // Checkout back to original branch before failing
            git(`checkout ${originalBranch}`);
            if (!options.dryRun) {
                await notifyAgentError('Implementation', content.title, issueNumber, error);
            }
            return { success: false, error };
        }

        console.log(`  Agent completed in ${result.durationSeconds}s`);

        // Check if there are changes to commit
        if (!hasUncommittedChanges()) {
            console.log('  No changes to commit');
            git(`checkout ${originalBranch}`);
            return { success: false, error: 'Agent did not make any changes' };
        }

        // Run post-work yarn checks - fix any new issues
        if (!options.dryRun) {
            console.log('  Running post-work yarn checks...');
            const postChecks = runYarnChecks();
            if (!postChecks.success) {
                console.log('  ⚠️ Issues found - asking Claude to fix...');

                // Run Claude to fix the issues
                const fixResult = await runAgent({
                    prompt: `The following yarn checks errors need to be fixed:\n\n${postChecks.output}\n\nFix these issues in the codebase. Only fix the issues shown above, do not make any other changes.`,
                    stream: options.stream,
                    verbose: options.verbose,
                    timeout: options.timeout,
                    progressLabel: 'Fixing yarn checks issues',
                    allowWrite: true,
                });

                if (!fixResult.success) {
                    console.error('  ⚠️ Could not auto-fix issues - continuing anyway');
                } else {
                    // Re-run checks to verify
                    const recheck = runYarnChecks();
                    if (recheck.success) {
                        console.log('  ✅ Issues fixed');
                    } else {
                        console.log('  ⚠️ Some issues may remain - continuing anyway');
                    }
                }
            } else {
                console.log('  ✅ No new issues introduced');
            }
        }

        if (options.dryRun) {
            console.log('  [DRY RUN] Would commit changes');
            console.log('  [DRY RUN] Would push to remote');
            if (mode === 'new') {
                console.log('  [DRY RUN] Would create PR');
            }
            console.log('  [DRY RUN] Would set Review Status to Waiting for Review');
            console.log('  [DRY RUN] Would send notification');
            // Discard changes and checkout back
            try {
                git('checkout -- .');
                git(`checkout ${originalBranch}`);
            } catch (cleanupError) {
                console.error('  Warning: Failed to clean up after dry run:', cleanupError);
            }
            return { success: true };
        }

        // Commit changes
        const commitMessage = mode === 'new'
            ? `feat: ${content.title}\n\nCloses #${issueNumber}`
            : `fix: address review feedback for #${issueNumber}`;

        console.log('  Committing changes...');
        commitChanges(commitMessage);

        // Push to remote
        if (!options.skipPush) {
            console.log('  Pushing to remote...');
            pushBranch(branchName, mode === 'feedback');
        }

        let prNumber = processable.prNumber;

        // Create PR if new implementation
        if (mode === 'new') {
            console.log('  Creating pull request...');
            const defaultBranch = await adapter.getDefaultBranch();

            // Get list of changed files for PR description
            const changedFiles = getChangedFiles();
            const filesSection = changedFiles.length > 0
                ? `## Files Changed\n\n${changedFiles.map((f) => `- \`${f}\``).join('\n')}\n\n`
                : '';

            const prBody = `## Summary

Implements the feature described in #${issueNumber}.

${filesSection}## Reference

See the issue for:
- Product Design
- Technical Design

## Test Plan

- [ ] \`yarn checks\` passes
- [ ] Manual testing completed

---
_Generated by Implementation Agent_`;

            const pr = await adapter.createPullRequest(branchName, defaultBranch, content.title, prBody);
            prNumber = pr.number;
            console.log(`  Created PR #${prNumber}: ${pr.url}`);

            // Add comment on issue linking to PR
            await adapter.addIssueComment(issueNumber, `Implementation PR: #${prNumber}`);
        } else {
            // Add comment on PR about addressed feedback
            if (prNumber) {
                await adapter.addPRComment(prNumber, 'Addressed review feedback. Ready for re-review.');
            }
        }

        // Update status to PR Review and set review status
        await adapter.updateItemStatus(item.id, STATUSES.prReview);
        console.log(`  Status updated to: ${STATUSES.prReview}`);
        if (adapter.hasReviewStatusField()) {
            await adapter.updateItemReviewStatus(item.id, REVIEW_STATUSES.waitingForReview);
            console.log(`  Review Status updated to: ${REVIEW_STATUSES.waitingForReview}`);
        }

        // Send notification
        if (prNumber) {
            await notifyPRReady(content.title, issueNumber, prNumber, mode === 'feedback');
            console.log('  Notification sent');
        }

        // Checkout back to original branch
        git(`checkout ${originalBranch}`);

        return { success: true, prNumber };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`  Error: ${errorMsg}`);

        // Try to checkout back to original branch
        try {
            git(`checkout ${originalBranch}`);
        } catch {
            console.error('  Warning: Could not checkout back to original branch');
        }

        if (!options.dryRun) {
            await notifyAgentError('Implementation', content.title, issueNumber, errorMsg);
        }
        return { success: false, error: errorMsg };
    }
}

/**
 * Extract PR number from a project item
 * The PR might be linked in comments or in the content
 */
async function extractPRNumber(
    item: ProjectItem,
    adapter: Awaited<ReturnType<typeof getProjectManagementAdapter>>
): Promise<number | undefined> {
    if (!item.content?.number) return undefined;

    // Check issue comments for PR link
    const comments = await adapter.getIssueComments(item.content.number);
    for (const comment of comments) {
        // Look for "PR: #123" or "Implementation PR: #123" pattern
        const match = comment.body.match(/(?:PR|Pull Request)[:\s]*#(\d+)/i);
        if (match) {
            return parseInt(match[1], 10);
        }
    }

    return undefined;
}

async function main(): Promise<void> {
    const program = new Command();

    program
        .name('implement')
        .description('Implement features and create PRs for GitHub Project items')
        .option('--id <itemId>', 'Process a specific project item by ID')
        .option('--limit <number>', 'Limit number of items to process', parseInt)
        .option('--timeout <seconds>', 'Timeout per item in seconds', parseInt)
        .option('--dry-run', 'Preview without making changes', false)
        .option('--stream', "Stream Claude's output in real-time", false)
        .option('--verbose', 'Show additional debug output', false)
        .option('--skip-push', 'Skip pushing to remote (for testing)', false)
        .parse(process.argv);

    const opts = program.opts();
    const options: ImplementOptions = {
        id: opts.id as string | undefined,
        limit: opts.limit as number | undefined,
        timeout: (opts.timeout as number | undefined) ?? agentConfig.claude.timeoutSeconds,
        dryRun: Boolean(opts.dryRun),
        verbose: Boolean(opts.verbose),
        stream: Boolean(opts.stream),
        skipPush: Boolean(opts.skipPush),
    };

    console.log('\n========================================');
    console.log('  Implementation Agent');
    console.log('========================================');
    console.log(`  Timeout: ${options.timeout}s per item`);
    if (options.dryRun) {
        console.log('  Mode: DRY RUN (no changes will be saved)');
    }
    console.log('');

    // Check for uncommitted changes before starting
    if (hasUncommittedChanges()) {
        console.error('Error: Uncommitted changes in working directory.');
        console.error('Please commit or stash your changes before running this agent.');
        process.exit(1);
    }

    // Pull latest from master
    console.log('Pulling latest from master...');
    try {
        const defaultBranch = git('symbolic-ref refs/remotes/origin/HEAD --short', { silent: true }).replace('origin/', '');
        git(`checkout ${defaultBranch}`, { silent: true });
        git(`pull origin ${defaultBranch}`, { silent: true });
        console.log(`  ✅ On latest ${defaultBranch}`);
    } catch (error) {
        console.error('Error: Failed to pull latest from master.');
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }

    // Initialize project management adapter
    console.log('\nConnecting to GitHub...');
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
        let prNumber: number | undefined;

        if (item.status === STATUSES.implementation && !item.reviewStatus) {
            mode = 'new';
        } else if (
            (item.status === STATUSES.implementation || item.status === STATUSES.prReview) &&
            item.reviewStatus === REVIEW_STATUSES.requestChanges
        ) {
            mode = 'feedback';
            prNumber = await extractPRNumber(item, adapter);
        } else {
            console.error(`Item is not in a processable state.`);
            console.error(`  Status: ${item.status}`);
            console.error(`  Review Status: ${item.reviewStatus}`);
            console.error(`  Expected: "${STATUSES.implementation}" with empty Review Status, or "${STATUSES.implementation}"/"${STATUSES.prReview}" with "${REVIEW_STATUSES.requestChanges}"`);
            process.exit(1);
        }

        itemsToProcess.push({ item, mode, prNumber });
    } else {
        // Flow A: Fetch items ready for implementation (Implementation status with empty Review Status)
        console.log(`\nFetching items in "${STATUSES.implementation}" with empty Review Status...`);
        const allImplementationItems = await adapter.listItems({ status: STATUSES.implementation, limit: options.limit || 50 });
        const newItems = allImplementationItems.filter((item) => !item.reviewStatus);
        for (const item of newItems) {
            itemsToProcess.push({ item, mode: 'new' });
        }
        console.log(`  Found ${newItems.length} item(s) for implementation`);

        // Flow B: Fetch items needing revision (Implementation or PR Review status with Request Changes)
        if (adapter.hasReviewStatusField()) {
            console.log(`\nFetching items with Review Status "${REVIEW_STATUSES.requestChanges}"...`);
            const feedbackItems = allImplementationItems.filter(
                (item) => item.reviewStatus === REVIEW_STATUSES.requestChanges
            );
            for (const item of feedbackItems) {
                const prNumber = await extractPRNumber(item, adapter);
                itemsToProcess.push({ item, mode: 'feedback', prNumber });
            }
            console.log(`  Found ${feedbackItems.length} item(s) in "${STATUSES.implementation}" needing revision`);

            // Also fetch PR Review items with Request Changes
            console.log(`\nFetching items in "${STATUSES.prReview}" with Review Status "${REVIEW_STATUSES.requestChanges}"...`);
            const prReviewItems = await adapter.listItems({ status: STATUSES.prReview, limit: options.limit || 50 });
            const prFeedbackItems = prReviewItems.filter(
                (item) => item.reviewStatus === REVIEW_STATUSES.requestChanges
            );
            for (const item of prFeedbackItems) {
                const prNumber = await extractPRNumber(item, adapter);
                itemsToProcess.push({ item, mode: 'feedback', prNumber });
            }
            console.log(`  Found ${prFeedbackItems.length} item(s) in "${STATUSES.prReview}" needing revision`);
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
            if (result.prNumber) {
                console.log(`  PR: #${result.prNumber}`);
            }
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
        await notifyBatchComplete('Implementation', results.processed, results.succeeded, results.failed);
    }
}

// Run
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
