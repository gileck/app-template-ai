/**
 * GitHub Sync Service
 *
 * Server-side service for syncing feature requests to GitHub.
 * Used by both the API (approve action) and CLI (batch sync).
 */

import { featureRequests } from '@/server/database';
import type { FeatureRequestDocument } from '@/server/database/collections/feature-requests/types';
import { sendNotificationToOwner } from '@/server/telegram';
import { getProjectManagementAdapter, STATUSES } from '@/server/project-management';

// ============================================================
// HELPERS
// ============================================================

function buildIssueBody(request: FeatureRequestDocument): string {
    const sections: string[] = [];

    sections.push(`## Description\n\n${request.description}`);

    if (request.page) {
        sections.push(`## Related Page/Area\n\n${request.page}`);
    }

    if (request.priority) {
        const priorityEmojis: Record<string, string> = {
            low: ':small_blue_diamond:',
            medium: ':small_orange_diamond:',
            high: ':large_orange_diamond:',
            critical: ':red_circle:',
        };
        sections.push(`## Priority\n\n${priorityEmojis[request.priority] || ''} ${request.priority.toUpperCase()}`);
    }

    sections.push(`---\n\n_Synced from feature request \`${request._id}\`_`);

    return sections.join('\n\n');
}

function getLabels(request: FeatureRequestDocument): string[] {
    const labels: string[] = ['feature-request'];
    if (request.priority) {
        labels.push(`priority:${request.priority}`);
    }
    return labels;
}

// ============================================================
// PUBLIC API
// ============================================================

export interface SyncToGitHubResult {
    success: boolean;
    issueNumber?: number;
    issueUrl?: string;
    projectItemId?: string;
    error?: string;
}

/**
 * Sync a feature request to GitHub
 * Creates an issue and adds it to the project with Backlog status
 */
export async function syncFeatureRequestToGitHub(
    requestId: string
): Promise<SyncToGitHubResult> {
    try {
        // Get the feature request
        const request = await featureRequests.findFeatureRequestById(requestId);
        if (!request) {
            return { success: false, error: 'Feature request not found' };
        }

        // Check if already synced
        if (request.githubIssueUrl) {
            return {
                success: true,
                issueNumber: request.githubIssueNumber,
                issueUrl: request.githubIssueUrl,
                projectItemId: request.githubProjectItemId,
            };
        }

        // Initialize project management adapter
        const adapter = getProjectManagementAdapter();
        await adapter.init();

        // Create the issue
        const issueBody = buildIssueBody(request);
        const labels = getLabels(request);

        const issueResult = await adapter.createIssue(request.title, issueBody, labels);
        const { number: issueNumber, url: issueUrl, nodeId: issueNodeId } = issueResult;

        // Add issue to project
        const projectItemId = await adapter.addIssueToProject(issueNodeId);

        // Set status to Backlog
        await adapter.updateItemStatus(projectItemId, STATUSES.backlog);

        // Update MongoDB with GitHub fields
        await featureRequests.updateGitHubFields(requestId, {
            githubIssueUrl: issueUrl,
            githubIssueNumber: issueNumber,
            githubProjectItemId: projectItemId,
        });

        // Send notification
        try {
            await sendNotificationToOwner(
                `✅ Feature request synced to GitHub!\n\n` +
                `📋 ${request.title}\n` +
                `🔗 Issue #${issueNumber}: ${issueUrl}\n` +
                `📊 Status: ${STATUSES.backlog}`
            );
        } catch {
            // Don't fail if notification fails
            console.warn('Failed to send notification');
        }

        return {
            success: true,
            issueNumber,
            issueUrl,
            projectItemId,
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('GitHub sync error:', errorMsg);
        return { success: false, error: errorMsg };
    }
}

/**
 * Approve a feature request and sync to GitHub
 * Updates status to product_design and creates GitHub issue
 */
export async function approveFeatureRequest(
    requestId: string
): Promise<{
    success: boolean;
    featureRequest?: FeatureRequestDocument;
    githubResult?: SyncToGitHubResult;
    error?: string;
}> {
    try {
        // First update the status to product_design
        const updated = await featureRequests.updateFeatureRequestStatus(
            requestId,
            'product_design'
        );

        if (!updated) {
            return { success: false, error: 'Feature request not found' };
        }

        // Then sync to GitHub (creates issue with Backlog status)
        const githubResult = await syncFeatureRequestToGitHub(requestId);

        if (!githubResult.success) {
            // Revert status if GitHub sync failed
            await featureRequests.updateFeatureRequestStatus(requestId, 'in_review');
            return {
                success: false,
                error: `GitHub sync failed: ${githubResult.error}`,
            };
        }

        // Update GitHub Project status to Product Design (ready for agent)
        // This sets the item to the first phase with empty review status
        if (githubResult.projectItemId) {
            const adapter = getProjectManagementAdapter();
            await adapter.init();
            await adapter.updateItemStatus(githubResult.projectItemId, STATUSES.productDesign);
            // Ensure review status is empty (ready for agent to process)
            if (adapter.hasReviewStatusField()) {
                await adapter.updateItemReviewStatus(githubResult.projectItemId, '');
            }
        }

        // Fetch the updated request with GitHub fields
        const finalRequest = await featureRequests.findFeatureRequestById(requestId);

        return {
            success: true,
            featureRequest: finalRequest || undefined,
            githubResult,
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('Approve feature request error:', errorMsg);
        return { success: false, error: errorMsg };
    }
}
