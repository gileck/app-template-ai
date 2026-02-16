/**
 * Get Command
 *
 * Gets full details of a specific feature request or bug report by ID.
 */

import { featureRequests, reports } from '@/server/database';
import type { FeatureRequestDocument } from '@/server/database/collections/template/feature-requests/types';
import type { ReportDocument } from '@/server/database/collections/template/reports/types';
import { findWorkflowItemBySourceRef, findWorkflowItemByIssueNumber } from '@/server/database/collections/template/workflow-items/workflow-items';
import type { WorkflowItemDocument } from '@/server/database/collections/template/workflow-items/types';
import { getProjectManagementAdapter } from '@/server/template/project-management';
import { parseArgs } from '../utils/parse-args';

interface GitHubProjectInfo {
    status: string | null;
    reviewStatus: string | null;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
    return date.toISOString().replace('T', ' ').slice(0, 19);
}

type FindResult = { type: 'feature'; item: FeatureRequestDocument } | { type: 'bug'; item: ReportDocument };

/**
 * Find item by ID, ID prefix, or GitHub issue number
 */
async function findById(
    id: string,
    typeHint?: string
): Promise<FindResult | null> {
    // If type hint provided, search that collection first
    if (typeHint === 'feature') {
        const feature = await tryFindFeature(id);
        if (feature) return { type: 'feature', item: feature };
        return null;
    }

    if (typeHint === 'bug') {
        const report = await tryFindReport(id);
        if (report) return { type: 'bug', item: report };
        return null;
    }

    // No type hint - search both collections by ObjectId
    const feature = await tryFindFeature(id);
    if (feature) return { type: 'feature', item: feature };

    const report = await tryFindReport(id);
    if (report) return { type: 'bug', item: report };

    // Try by GitHub issue number
    const issueNum = parseInt(id, 10);
    if (!isNaN(issueNum)) {
        const wi = await findWorkflowItemByIssueNumber(issueNum);
        if (wi?.sourceRef) {
            if (wi.sourceRef.collection === 'feature-requests') {
                const f = await featureRequests.findFeatureRequestById(wi.sourceRef.id.toString());
                if (f) return { type: 'feature', item: f };
            } else {
                const r = await reports.findReportById(wi.sourceRef.id.toString());
                if (r) return { type: 'bug', item: r };
            }
        }
    }

    return null;
}

/**
 * Try to find a feature request by ID or prefix
 */
async function tryFindFeature(id: string): Promise<FeatureRequestDocument | null> {
    // Try exact match first
    try {
        const exact = await featureRequests.findFeatureRequestById(id);
        if (exact) return exact;
    } catch {
        // Invalid ObjectId format, try prefix search
    }

    // Try prefix match
    if (id.length >= 6 && id.length < 24) {
        const all = await featureRequests.findFeatureRequests();
        const match = all.find(f => f._id.toString().startsWith(id));
        if (match) return match;
    }

    return null;
}

/**
 * Try to find a report by ID or prefix
 */
async function tryFindReport(id: string): Promise<ReportDocument | null> {
    // Try exact match first
    try {
        const exact = await reports.findReportById(id);
        if (exact) return exact;
    } catch {
        // Invalid ObjectId format, try prefix search
    }

    // Try prefix match
    if (id.length >= 6 && id.length < 24) {
        const all = await reports.findReports();
        const match = all.find(r => r._id.toString().startsWith(id));
        if (match) return match;
    }

    return null;
}

/**
 * Fetch GitHub Project status for an item
 */
async function fetchGitHubProjectInfo(projectItemId: string): Promise<GitHubProjectInfo | null> {
    try {
        const adapter = getProjectManagementAdapter();
        await adapter.init();
        const item = await adapter.getItem(projectItemId);
        if (!item) return null;
        return {
            status: item.status,
            reviewStatus: item.reviewStatus,
        };
    } catch (error) {
        console.warn(`  Warning: Could not fetch GitHub Project status: ${error}`);
        return null;
    }
}

/**
 * Print feature request details
 */
function printFeatureDetails(feature: FeatureRequestDocument, githubInfo: GitHubProjectInfo | null): void {
    console.log('=== Feature Request ===\n');
    console.log(`  ID:          ${feature._id}`);
    console.log(`  Title:       ${feature.title}`);
    console.log(`  Status:      ${feature.status}`);
    console.log(`  Priority:    ${feature.priority}`);
    console.log(`  Source:      ${feature.source || 'ui'}`);
    console.log(`  Created:     ${formatDate(feature.createdAt)}`);
    console.log(`  Updated:     ${formatDate(feature.updatedAt)}`);
    console.log(`  Requested By: ${feature.requestedByName || 'Unknown'}`);

    if (feature.githubIssueUrl) {
        console.log(`\n  GitHub Issue: #${feature.githubIssueNumber}`);
        console.log(`  GitHub URL:   ${feature.githubIssueUrl}`);
        if (githubInfo) {
            console.log(`  GitHub Status: ${githubInfo.status || 'N/A'}`);
            if (githubInfo.reviewStatus) {
                console.log(`  Review Status: ${githubInfo.reviewStatus}`);
            }
        }
    }

    console.log(`\n  Description:\n    ${feature.description.split('\n').join('\n    ')}`);

    if (feature.adminNotes) {
        console.log(`\n  Admin Notes:\n    ${feature.adminNotes.split('\n').join('\n    ')}`);
    }

    if (feature.comments && feature.comments.length > 0) {
        console.log(`\n  Comments (${feature.comments.length}):`);
        for (const comment of feature.comments) {
            console.log(`    - [${formatDate(comment.createdAt)}] ${comment.authorName}: ${comment.content}`);
        }
    }
}

/**
 * Print report details
 */
function printReportDetails(report: ReportDocument, githubInfo: GitHubProjectInfo | null): void {
    console.log('=== Bug Report ===\n');
    console.log(`  ID:          ${report._id}`);
    console.log(`  Status:      ${report.status}`);
    console.log(`  Type:        ${report.type}`);
    console.log(`  Source:      ${report.source || 'ui'}`);
    console.log(`  Route:       ${report.route}`);
    console.log(`  Created:     ${formatDate(report.createdAt)}`);
    console.log(`  Updated:     ${formatDate(report.updatedAt)}`);

    if (report.occurrenceCount && report.occurrenceCount > 1) {
        console.log(`  Occurrences: ${report.occurrenceCount}`);
        if (report.firstOccurrence) {
            console.log(`  First:       ${formatDate(report.firstOccurrence)}`);
        }
        if (report.lastOccurrence) {
            console.log(`  Last:        ${formatDate(report.lastOccurrence)}`);
        }
    }

    if (report.githubIssueUrl) {
        console.log(`\n  GitHub Issue: #${report.githubIssueNumber}`);
        console.log(`  GitHub URL:   ${report.githubIssueUrl}`);
        if (githubInfo) {
            console.log(`  GitHub Status: ${githubInfo.status || 'N/A'}`);
            if (githubInfo.reviewStatus) {
                console.log(`  Review Status: ${githubInfo.reviewStatus}`);
            }
        }
    }

    if (report.description) {
        console.log(`\n  Description:\n    ${report.description.split('\n').join('\n    ')}`);
    }

    if (report.errorMessage) {
        console.log(`\n  Error Message:\n    ${report.errorMessage}`);
    }

    if (report.investigation) {
        console.log(`\n  Investigation:`);
        console.log(`    Status: ${report.investigation.status}`);
        console.log(`    Headline: ${report.investigation.headline}`);
        console.log(`    Summary: ${report.investigation.summary}`);
        console.log(`    Confidence: ${report.investigation.confidence}`);
        if (report.investigation.rootCause) {
            console.log(`    Root Cause: ${report.investigation.rootCause}`);
        }
        if (report.investigation.proposedFix) {
            console.log(`    Proposed Fix: ${report.investigation.proposedFix.description}`);
            console.log(`    Fix Complexity: ${report.investigation.proposedFix.complexity}`);
        }
    }

    if (report.browserInfo) {
        console.log(`\n  Browser Info:`);
        console.log(`    User Agent: ${report.browserInfo.userAgent}`);
        if (report.browserInfo.viewport) {
            console.log(`    Viewport:   ${report.browserInfo.viewport.width}x${report.browserInfo.viewport.height}`);
        }
    }
}

/**
 * Print workflow item details from the workflow-items collection
 */
function printWorkflowItemDetails(item: WorkflowItemDocument): void {
    console.log('\n=== Workflow Item ===\n');
    console.log(`  ID:              ${item._id}`);
    console.log(`  Type:            ${item.type}`);
    console.log(`  Title:           ${item.title}`);
    console.log(`  Status:          ${item.status}`);
    if (item.reviewStatus) console.log(`  Review Status:   ${item.reviewStatus}`);
    if (item.implementationPhase) console.log(`  Impl Phase:      ${item.implementationPhase}`);
    if (item.priority) console.log(`  Priority:        ${item.priority}`);
    if (item.size) console.log(`  Size:            ${item.size}`);
    if (item.complexity) console.log(`  Complexity:      ${item.complexity}`);
    if (item.domain) console.log(`  Domain:          ${item.domain}`);
    if (item.labels?.length) console.log(`  Labels:          ${item.labels.join(', ')}`);
    if (item.createdBy) console.log(`  Created By:      ${item.createdBy}`);
    console.log(`  Reviewed:        ${item.reviewed ?? false}`);
    if (item.reviewSummary) console.log(`  Review Summary:  ${item.reviewSummary}`);
    console.log(`  Created:         ${formatDate(item.createdAt)}`);
    console.log(`  Updated:         ${formatDate(item.updatedAt)}`);

    if (item.githubIssueNumber) {
        console.log(`\n  GitHub Issue:    #${item.githubIssueNumber}`);
        if (item.githubIssueUrl) console.log(`  GitHub URL:      ${item.githubIssueUrl}`);
    }

    if (item.sourceRef) {
        console.log(`\n  Source:          ${item.sourceRef.collection} / ${item.sourceRef.id}`);
    }

    // Artifacts
    if (item.artifacts) {
        const a = item.artifacts;
        if (a.designs?.length) {
            console.log(`\n  Designs (${a.designs.length}):`);
            for (const d of a.designs) {
                console.log(`    - ${d.type}: ${d.path} (${d.status}${d.prNumber ? `, PR #${d.prNumber}` : ''})`);
            }
        }
        if (a.phases?.length) {
            console.log(`\n  Phases (${a.phases.length}):`);
            for (const p of a.phases) {
                console.log(`    - Phase ${p.order}: ${p.name} [${p.estimatedSize}] (${p.status}${p.prNumber ? `, PR #${p.prNumber}` : ''})`);
            }
        }
        if (a.taskBranch) console.log(`\n  Task Branch:     ${a.taskBranch}`);
        if (a.finalPrNumber) console.log(`  Final PR:        #${a.finalPrNumber}`);
        if (a.revertPrNumber) console.log(`  Revert PR:       #${a.revertPrNumber}`);
        if (a.lastMergedPr) {
            console.log(`  Last Merged PR:  #${a.lastMergedPr.prNumber}${a.lastMergedPr.phase ? ` (${a.lastMergedPr.phase})` : ''} at ${a.lastMergedPr.mergedAt}`);
        }
        if (a.decision) {
            console.log(`\n  Decision:`);
            console.log(`    Agent:   ${a.decision.agentId}`);
            console.log(`    Type:    ${a.decision.type}`);
            console.log(`    Options: ${a.decision.options.map(o => o.title ?? o.id).join(', ')}`);
            if (a.decision.selection) {
                const sel = a.decision.selection;
                console.log(`    Selected: ${sel.selectedOptionId ?? (sel.chooseRecommended ? '(recommended)' : 'N/A')}`);
            }
        }
        if (a.commitMessages?.length) {
            console.log(`\n  Commit Messages (${a.commitMessages.length}):`);
            for (const cm of a.commitMessages) {
                console.log(`    - PR #${cm.prNumber}: ${cm.title}`);
            }
        }
    }

    // History
    if (item.history?.length) {
        console.log(`\n  History (${item.history.length}):`);
        for (const h of item.history) {
            console.log(`    - [${h.timestamp}] ${h.action}: ${h.description}${h.actor ? ` (${h.actor})` : ''}`);
        }
    }
}

/**
 * Handle the get command
 */
export async function handleGet(args: string[]): Promise<void> {
    const parsed = parseArgs(args);

    // Get ID from positional argument or --id flag
    const id = parsed.id || args.find(arg => !arg.startsWith('--'));

    if (!id) {
        console.error('Error: Missing required argument: <id>');
        console.error('Usage: yarn agent-workflow get <id> [--type feature|bug]');
        process.exit(1);
    }

    console.log(`\nFetching item ${id}...\n`);

    const result = await findById(id, parsed.type);

    if (!result) {
        console.error(`Error: Item not found with ID: ${id}`);
        console.error('\nTip: Use `yarn agent-workflow list` to see available items.');
        process.exit(1);
    }

    // Fetch GitHub Project info if available
    let githubInfo: GitHubProjectInfo | null = null;
    const projectItemId = result.type === 'feature'
        ? (result.item as FeatureRequestDocument).githubProjectItemId
        : (result.item as ReportDocument).githubProjectItemId;

    if (projectItemId) {
        console.log('Fetching GitHub Project status...\n');
        githubInfo = await fetchGitHubProjectInfo(projectItemId);
    }

    if (result.type === 'feature') {
        printFeatureDetails(result.item, githubInfo);
    } else {
        printReportDetails(result.item, githubInfo);
    }

    // Fetch and print workflow item details
    const issueNumber = result.type === 'feature'
        ? (result.item as FeatureRequestDocument).githubIssueNumber
        : (result.item as ReportDocument).githubIssueNumber;

    let workflowItem: WorkflowItemDocument | null = null;
    if (issueNumber) {
        workflowItem = await findWorkflowItemByIssueNumber(issueNumber);
    }
    if (!workflowItem) {
        const sourceCollection = result.type === 'feature' ? 'feature-requests' : 'reports';
        workflowItem = await findWorkflowItemBySourceRef(sourceCollection, result.item._id);
    }

    if (workflowItem) {
        printWorkflowItemDetails(workflowItem);
    } else {
        console.log('\n  (No workflow item found for this source)');
    }

    console.log('');
}
