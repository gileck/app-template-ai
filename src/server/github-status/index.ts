/**
 * GitHub Project Status Service
 *
 * Fetches and updates GitHub Project status for feature requests.
 * Uses the shared GitHub client.
 */

import { getGitHubClient, type GitHubProjectStatus } from '@/server/github';

export type { GitHubProjectStatus };

/**
 * Get the GitHub Project status for a project item
 */
export async function getGitHubProjectStatus(
    projectItemId: string
): Promise<GitHubProjectStatus | null> {
    try {
        const client = getGitHubClient();
        return await client.getProjectItemStatus(projectItemId);
    } catch (error) {
        console.error('Failed to fetch GitHub project status:', error);
        return null;
    }
}

/**
 * Get available GitHub Project status options
 */
export async function getAvailableStatuses(): Promise<string[]> {
    try {
        const client = getGitHubClient();
        return await client.getStatusOptions();
    } catch (error) {
        console.error('Failed to fetch available statuses:', error);
        return [];
    }
}

/**
 * Get available GitHub Project review status options
 */
export async function getAvailableReviewStatuses(): Promise<string[]> {
    try {
        const client = getGitHubClient();
        return await client.getReviewStatusOptions();
    } catch (error) {
        console.error('Failed to fetch available review statuses:', error);
        return [];
    }
}

/**
 * Update the GitHub Project status for a project item
 */
export async function updateGitHubProjectStatus(
    projectItemId: string,
    status: string
): Promise<boolean> {
    try {
        const client = getGitHubClient();
        await client.updateProjectItemStatus(projectItemId, status);
        return true;
    } catch (error) {
        console.error('Failed to update GitHub project status:', error);
        return false;
    }
}

/**
 * Update the GitHub Project review status for a project item
 */
export async function updateGitHubReviewStatus(
    projectItemId: string,
    reviewStatus: string
): Promise<boolean> {
    try {
        const client = getGitHubClient();
        await client.updateProjectItemReviewStatus(projectItemId, reviewStatus);
        return true;
    } catch (error) {
        console.error('Failed to update GitHub review status:', error);
        return false;
    }
}
