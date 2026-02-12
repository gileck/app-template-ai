#!/usr/bin/env tsx
/**
 * Product Design Agent
 *
 * Generates Product Design documents for GitHub Project items.
 * Creates PRs with design files and interactive React mock pages.
 *
 * Flow A (New Design):
 *   - Fetches items in "Product Design" status with empty Review Status
 *   - Generates product design with 2-3 mock options using Claude (read-only mode)
 *   - Creates branch, writes design file + mock page, creates PR
 *   - Creates decision for admin to choose between mock options
 *   - Sends Telegram notification with decision link and preview URL
 *   - Sets Review Status to "Waiting for Review"
 *
 * Flow B (Address Feedback):
 *   - Fetches items in "Product Design" with Review Status = "Request Changes"
 *   - Reads admin feedback comments
 *   - Revises product design based on feedback
 *   - Updates existing design file and PR
 *   - Sets Review Status back to "Waiting for Review"
 *
 * Usage:
 *   yarn agent:product-design                    # Process all pending
 *   yarn agent:product-design --id <item-id>     # Process specific item
 *   yarn agent:product-design --dry-run          # Preview without saving
 *   yarn agent:product-design --stream           # Stream Claude output
 */

import '../../shared/loadEnv';
import {
    // Config
    STATUSES,
    // Prompts
    buildProductDesignPrompt,
    buildProductDesignRevisionPrompt,
    buildProductDesignClarificationPrompt,
    // Output schemas
    PRODUCT_DESIGN_OUTPUT_FORMAT,
    // CLI & Batch
    createCLI,
    runBatch,
    // Design Agent Processor
    createDesignProcessor,
} from '../../shared';
import type { ProductDesignOutput, MockOption } from '../../shared';
import {
    readDesignDocAsync,
    generateMockPageContent,
    writeMockComponent,
    writeMockPage,
} from '../../lib/design-files';
import {
    logGitHubAction,
} from '../../lib/logging';
import { formatDecisionComment, saveDecisionToDB } from '@/apis/template/agent-decision/utils';
import { notifyDecisionNeeded } from '../../shared/notifications';
import type { DecisionOption, MetadataFieldConfig, RoutingConfig } from '@/apis/template/agent-decision/types';
import { commitChanges, pushBranch, getCurrentBranch } from '../../shared/git-utils';

// ============================================================
// DECISION FLOW CONFIG
// ============================================================

/** Metadata schema for product design decision options */
const DESIGN_MOCK_METADATA_SCHEMA: MetadataFieldConfig[] = [
    { key: 'approach', label: 'Approach', type: 'tag' },
];

/** Routing config: all design options route to Technical Design */
const DESIGN_MOCK_ROUTING: RoutingConfig = {
    metadataKey: 'approach',
    statusMap: {},
    // All options route to same destination — handled by submitDecision hook
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Convert mock options to decision options for the decision flow system
 */
function toDecisionOptions(mockOptions: MockOption[]): DecisionOption[] {
    return mockOptions.map(opt => ({
        id: opt.id,
        title: opt.title,
        description: opt.description,
        isRecommended: opt.isRecommended,
        metadata: {
            approach: opt.title,
        },
    }));
}

// ============================================================
// PROCESSOR
// ============================================================

const processItem = createDesignProcessor({
    workflow: 'product-design',
    phaseName: 'Product Design',
    designType: 'product',
    agentName: 'product-design',
    outputFormat: PRODUCT_DESIGN_OUTPUT_FORMAT,
    outputDesignField: 'design',

    modeLabels: {
        new: 'New Design',
        feedback: 'Address Feedback',
        clarification: 'Clarification',
    },

    progressLabels: {
        new: 'Generating product design',
        feedback: 'Revising product design',
        clarification: 'Continuing with clarification',
    },

    skipBugs: true,
    skipBugMessage: `\u23ED\uFE0F  Skipping bug - bugs bypass Product Design phase\n\uD83D\uDCCC Reason: Most bugs don't need product design (they need technical fixes)\n\uD83D\uDCA1 If this bug requires UX/UI redesign, admin can manually move it to Product Design`,
    skipBugError: 'Bug reports skip Product Design by default',

    buildNewPrompt: ({ content, additionalContext, allComments }) =>
        buildProductDesignPrompt(content, additionalContext, allComments),

    buildFeedbackPrompt: ({ content, existingDesign, allComments }) =>
        buildProductDesignRevisionPrompt(content, existingDesign, allComments),

    buildClarificationPrompt: ({ content, issueNumber, allComments, clarification }) =>
        buildProductDesignClarificationPrompt(
            { title: content.title, number: issueNumber, body: content.body, labels: content.labels },
            allComments,
            clarification,
        ),

    loadAdditionalContext: async ({ issueNumber }) => {
        // Check for Product Development Document (PDD) — tries S3 first, then filesystem
        const productDevelopmentDoc = await readDesignDocAsync(issueNumber, 'product-dev');
        return productDevelopmentDoc
            ? { context: productDevelopmentDoc, label: 'Found Product Development Document (PDD) - will use as context' }
            : { context: null };
    },

    afterPR: async ({ prNumber: _prNumber, adapter, structuredOutput, logCtx, mode, issueNumber, content: _content }) => {
        const output = structuredOutput as unknown as ProductDesignOutput;
        const mockOptions = output?.mockOptions;

        // Only create mock pages and decisions for new designs with mock options
        if (!mockOptions || mockOptions.length < 2 || mode !== 'new') {
            return;
        }

        console.log(`  Mock options: ${mockOptions.length} design options generated`);

        // 1. Write mock component files and page to branch
        try {
            for (const opt of mockOptions) {
                const compPath = writeMockComponent(issueNumber, opt.id, opt.componentCode);
                console.log(`    Written: ${compPath}`);
            }

            const pageContent = generateMockPageContent(issueNumber, mockOptions);
            const pagePath = writeMockPage(issueNumber, pageContent);
            console.log(`    Written: ${pagePath}`);

            // Commit and push the mock files
            const branchName = getCurrentBranch();
            commitChanges(`docs: add design mocks for issue #${issueNumber}`);
            pushBranch(branchName, true);
            console.log('  Mock files committed and pushed');
            logGitHubAction(logCtx, 'branch', `Added design mock page for issue #${issueNumber}`);
        } catch (mockError) {
            // Non-fatal — decision can still work without mock page
            console.warn(`  Warning: Failed to write mock page (non-fatal): ${mockError instanceof Error ? mockError.message : String(mockError)}`);
        }

        // 2. Save each option's design description to S3
        for (const opt of mockOptions) {
            try {
                const { uploadFile } = await import('@/server/s3/sdk');
                const optionKey = `design-docs/issue-${issueNumber}/product-design-${opt.id}.md`;
                await uploadFile({
                    content: `# ${opt.title}\n\n${opt.description}`,
                    fileName: optionKey,
                    contentType: 'text/markdown',
                });
            } catch {
                console.warn(`  Warning: Failed to save option ${opt.id} design to S3 (non-fatal)`);
            }
        }
        console.log(`  Saved ${mockOptions.length} option designs to S3`);

        // 3. Create decision for admin to choose between options
        const decisionOptions = toDecisionOptions(mockOptions);
        const decisionContext = `**Design Options:** ${mockOptions.length} approaches generated\n\nReview each option and select the design approach for this feature. Each option is available as an interactive mock on the PR preview deployment.`;

        // Post decision comment on issue
        const decisionComment = formatDecisionComment(
            'product-design',
            'design-selection',
            decisionContext,
            decisionOptions,
            DESIGN_MOCK_METADATA_SCHEMA,
            undefined, // no custom destination options — all route to Tech Design
            DESIGN_MOCK_ROUTING
        );
        await adapter.addIssueComment(issueNumber, decisionComment);
        console.log('  Decision comment posted on issue');
        logGitHubAction(logCtx, 'comment', `Posted design decision with ${mockOptions.length} options`);

        // Save decision to DB
        await saveDecisionToDB(
            issueNumber,
            'product-design',
            'design-selection',
            decisionContext,
            decisionOptions,
            DESIGN_MOCK_METADATA_SCHEMA,
            undefined,
            DESIGN_MOCK_ROUTING
        );

    },

    overrideNotification: async ({ prNumber, issueNumber, content, issueType, mode, comment }) => {
        // For feedback/clarification mode, use default approve notification
        if (mode !== 'new') return false;

        // For new designs, try to send decision notification with preview URL
        // If no mock options were generated, fall through to default
        try {
            const { getDecisionFromDB } = await import('@/apis/template/agent-decision/utils');
            const decision = await getDecisionFromDB(issueNumber, content.title);
            if (decision && decision.options.length >= 2) {
                // Fetch Vercel preview URL (non-blocking, returns null if unavailable)
                let previewUrl: string | null = null;
                try {
                    const { getVercelPreviewUrl } = await import('@/agents/lib/preview-url');
                    previewUrl = await getVercelPreviewUrl(prNumber);
                } catch {
                    // Preview URL is optional — continue without it
                }

                const summaryText = comment || `${decision.options.length} design options available`;
                await notifyDecisionNeeded(
                    'Product Design',
                    content.title,
                    issueNumber,
                    summaryText,
                    decision.options.length,
                    issueType,
                    false,
                    previewUrl
                );
                return true; // Override default notification
            }
        } catch {
            // Fall through to default notification
        }

        return false; // Use default notification
    },

    dryRunExtra: (structuredOutput) => {
        const output = structuredOutput as unknown as ProductDesignOutput;
        if (output?.mockOptions && output.mockOptions.length >= 2) {
            console.log(`  [DRY RUN] Would generate mock page with ${output.mockOptions.length} options:`);
            for (const opt of output.mockOptions) {
                console.log(`    - ${opt.id}: ${opt.title}${opt.isRecommended ? ' ⭐' : ''}`);
            }
            console.log('  [DRY RUN] Would create design decision for admin selection');
        }
    },

    prTitle: (issueNumber) => `docs: product design for issue #${issueNumber}`,
    prBody: (issueNumber) => `Design document for issue #${issueNumber}

Part of #${issueNumber}

---
*Generated by Product Design Agent*`,
});

// ============================================================
// CLI
// ============================================================

async function main(): Promise<void> {
    const { options } = createCLI({
        name: 'product-design',
        displayName: 'Product Design Agent',
        description: 'Generate Product Design documents for GitHub Project items',
    });

    await runBatch(
        {
            agentStatus: STATUSES.productDesign,
            agentDisplayName: 'Product Design',
        },
        options,
        processItem,
    );
}

// Run
main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
