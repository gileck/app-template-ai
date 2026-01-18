/**
 * GitHub Project Status Service
 *
 * Fetches the current status and review status of a project item from GitHub Projects V2.
 * Used by the UI to display live status from GitHub rather than synced database values.
 */

import { Octokit } from '@octokit/rest';

// Review Status field name (same as agents config)
const REVIEW_STATUS_FIELD = 'Review Status';

export interface GitHubProjectStatus {
    status: string | null;
    reviewStatus: string | null;
    issueState: 'OPEN' | 'CLOSED' | null;
}

/**
 * Get the GitHub Project status for a project item
 * @param projectItemId - The GitHub Project V2 item ID
 * @returns The current status and review status
 */
export async function getGitHubProjectStatus(
    projectItemId: string
): Promise<GitHubProjectStatus | null> {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
        console.warn('GITHUB_TOKEN not configured');
        return null;
    }

    const octokit = new Octokit({ auth: token.replace(/^["']|["']$/g, '') });

    try {
        const query = `query($itemId: ID!) {
            node(id: $itemId) {
                ... on ProjectV2Item {
                    content {
                        ... on Issue {
                            state
                        }
                    }
                    fieldValues(first: 20) {
                        nodes {
                            ... on ProjectV2ItemFieldSingleSelectValue {
                                name
                                field {
                                    ... on ProjectV2SingleSelectField {
                                        name
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }`;

        const result = await octokit.graphql<{
            node: {
                content: {
                    state?: string;
                } | null;
                fieldValues: {
                    nodes: Array<{
                        name?: string;
                        field?: { name: string };
                    }>;
                };
            } | null;
        }>(query, {
            itemId: projectItemId,
        });

        if (!result.node) {
            return null;
        }

        let status: string | null = null;
        let reviewStatus: string | null = null;

        for (const fv of result.node.fieldValues.nodes) {
            if (fv.field?.name === 'Status' && fv.name) {
                status = fv.name;
            }
            if (fv.field?.name === REVIEW_STATUS_FIELD && fv.name) {
                reviewStatus = fv.name;
            }
        }

        return {
            status,
            reviewStatus,
            issueState: (result.node.content?.state as 'OPEN' | 'CLOSED') || null,
        };
    } catch (error) {
        console.error('Failed to fetch GitHub project status:', error);
        return null;
    }
}
