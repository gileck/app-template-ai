/**
 * GitHub Sync Service
 *
 * Server-side service for syncing feature requests to GitHub.
 * Used by both the API (approve action) and CLI (batch sync).
 */

import { Octokit } from '@octokit/rest';
import { featureRequests } from '@/server/database';
import type { FeatureRequestDocument } from '@/server/database/collections/feature-requests/types';
import { sendNotificationToOwner } from '@/server/telegram';

// ============================================================
// CONFIGURATION
// ============================================================

// Status constants (same as scripts/agents/shared/config.ts)
const STATUSES = {
    backlog: 'Backlog',
} as const;

// Load config from environment or use defaults
const getConfig = () => {
    const owner = process.env.GITHUB_OWNER || 'gileck';
    const repo = process.env.GITHUB_REPO || 'app-template-ai';
    const projectNumber = parseInt(process.env.GITHUB_PROJECT_NUMBER || '3', 10);
    const ownerType = (process.env.GITHUB_OWNER_TYPE || 'user') as 'user' | 'org';

    return { owner, repo, projectNumber, ownerType };
};

// ============================================================
// GITHUB CLIENT
// ============================================================

let octokit: Octokit | null = null;
let projectId: string | null = null;
let statusFieldId: string | null = null;
let statusOptions: Map<string, string> | null = null;

function getOctokit(): Octokit {
    if (!octokit) {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            throw new Error('GITHUB_TOKEN environment variable is required');
        }
        octokit = new Octokit({ auth: token });
    }
    return octokit;
}

async function initProjectData(): Promise<void> {
    if (projectId && statusFieldId && statusOptions) {
        return; // Already initialized
    }

    const config = getConfig();
    const client = getOctokit();

    // Get project ID
    const projectQuery = config.ownerType === 'user'
        ? `query { user(login: "${config.owner}") { projectV2(number: ${config.projectNumber}) { id } } }`
        : `query { organization(login: "${config.owner}") { projectV2(number: ${config.projectNumber}) { id } } }`;

    const projectResult = await client.graphql<{
        user?: { projectV2: { id: string } };
        organization?: { projectV2: { id: string } };
    }>(projectQuery);

    projectId = config.ownerType === 'user'
        ? projectResult.user?.projectV2?.id ?? null
        : projectResult.organization?.projectV2?.id ?? null;

    if (!projectId) {
        throw new Error(`Project #${config.projectNumber} not found`);
    }

    // Get status field and options
    const fieldsQuery = `
        query($projectId: ID!) {
            node(id: $projectId) {
                ... on ProjectV2 {
                    fields(first: 50) {
                        nodes {
                            ... on ProjectV2SingleSelectField {
                                id
                                name
                                options { id name }
                            }
                        }
                    }
                }
            }
        }
    `;

    const fieldsResult = await client.graphql<{
        node: {
            fields: {
                nodes: Array<{
                    id: string;
                    name: string;
                    options?: Array<{ id: string; name: string }>;
                }>;
            };
        };
    }>(fieldsQuery, { projectId });

    const statusField = fieldsResult.node.fields.nodes.find(
        (f) => f.name === 'Status' && f.options
    );

    if (!statusField) {
        throw new Error('Status field not found in project');
    }

    statusFieldId = statusField.id;
    statusOptions = new Map(statusField.options!.map((o) => [o.name, o.id]));
}

// ============================================================
// SYNC LOGIC
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

        // Initialize GitHub connection
        await initProjectData();
        const client = getOctokit();
        const config = getConfig();

        // Create the issue
        const issueBody = buildIssueBody(request);
        const labels = getLabels(request);

        const issueResponse = await client.issues.create({
            owner: config.owner,
            repo: config.repo,
            title: request.title,
            body: issueBody,
            labels,
        });

        const issueNumber = issueResponse.data.number;
        const issueUrl = issueResponse.data.html_url;
        const issueNodeId = issueResponse.data.node_id;

        // Add issue to project
        const addToProjectMutation = `
            mutation($projectId: ID!, $contentId: ID!) {
                addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
                    item { id }
                }
            }
        `;

        const addResult = await client.graphql<{
            addProjectV2ItemById: { item: { id: string } };
        }>(addToProjectMutation, {
            projectId: projectId!,
            contentId: issueNodeId,
        });

        const projectItemId = addResult.addProjectV2ItemById.item.id;

        // Set status to Backlog
        const backlogOptionId = statusOptions!.get(STATUSES.backlog);
        if (backlogOptionId) {
            const updateStatusMutation = `
                mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
                    updateProjectV2ItemFieldValue(input: {
                        projectId: $projectId
                        itemId: $itemId
                        fieldId: $fieldId
                        value: { singleSelectOptionId: $optionId }
                    }) {
                        projectV2Item { id }
                    }
                }
            `;

            await client.graphql(updateStatusMutation, {
                projectId: projectId!,
                itemId: projectItemId,
                fieldId: statusFieldId!,
                optionId: backlogOptionId,
            });
        }

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

        // Then sync to GitHub
        const githubResult = await syncFeatureRequestToGitHub(requestId);

        if (!githubResult.success) {
            // Revert status if GitHub sync failed
            await featureRequests.updateFeatureRequestStatus(requestId, 'in_review');
            return {
                success: false,
                error: `GitHub sync failed: ${githubResult.error}`,
            };
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
