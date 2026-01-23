/**
 * Filtering Utility
 *
 * Client-side filtering logic for feature requests based on multiple criteria.
 */

import type { FeatureRequestClient, FeatureRequestStatus, FeatureRequestPriority } from '@/apis/feature-requests/types';
import type { GitHubFilterOption, AssignmentFilterOption, TimeFilterOption } from '../constants';
import { HEALTH_THRESHOLDS } from '../constants';

/**
 * Calculate days since a date
 */
function daysSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Filter feature requests by status
 */
export function filterByStatus(
    requests: FeatureRequestClient[],
    statuses: FeatureRequestStatus[]
): FeatureRequestClient[] {
    if (statuses.length === 0) return requests;
    return requests.filter((r) => statuses.includes(r.status));
}

/**
 * Filter feature requests by priority
 */
export function filterByPriority(
    requests: FeatureRequestClient[],
    priorities: FeatureRequestPriority[]
): FeatureRequestClient[] {
    if (priorities.length === 0) return requests;
    return requests.filter((r) => r.priority && priorities.includes(r.priority));
}

/**
 * Filter feature requests by GitHub criteria
 */
export function filterByGitHub(
    requests: FeatureRequestClient[],
    filters: GitHubFilterOption[]
): FeatureRequestClient[] {
    if (filters.length === 0) return requests;

    return requests.filter((r) => {
        return filters.every((filter) => {
            switch (filter) {
                case 'has_issue':
                    return !!r.githubIssueUrl;
                case 'has_pr':
                    return !!r.githubPrUrl;
                // Note: 'pr_merged' filter removed from implementation
                // until PR state is available in base request type.
                // This would require GitHub details to be fetched and
                // passed to filtering logic.
                default:
                    return true;
            }
        });
    });
}

/**
 * Filter feature requests by assignment criteria
 *
 * Note: Assignment filters are not fully implemented yet as they require
 * an assignedTo field to be added to the feature request schema.
 */
export function filterByAssignment(
    requests: FeatureRequestClient[],
    filters: AssignmentFilterOption[],
    _currentUserId?: string
): FeatureRequestClient[] {
    if (filters.length === 0) return requests;

    return requests.filter((_r) => {
        return filters.every((_filter) => {
            // TODO: Implement once assignedTo field is available:
            // - 'assigned_to_me': filter by assignedTo === currentUserId
            // - 'no_owner': filter by !assignedTo
            return true;
        });
    });
}

/**
 * Filter feature requests by time criteria
 */
export function filterByTime(
    requests: FeatureRequestClient[],
    filters: TimeFilterOption[]
): FeatureRequestClient[] {
    if (filters.length === 0) return requests;

    return requests.filter((r) => {
        return filters.every((filter) => {
            switch (filter) {
                case 'updated_recently':
                    const lastUpdate = r.lastActivityAt ?? r.updatedAt;
                    return daysSince(lastUpdate) <= 1;
                case 'stale':
                    const lastActivity = r.lastActivityAt ?? r.updatedAt;
                    return daysSince(lastActivity) >= HEALTH_THRESHOLDS.STALE_DAYS;
                default:
                    return true;
            }
        });
    });
}

/**
 * Apply all filters to feature requests
 */
export function applyFilters(
    requests: FeatureRequestClient[],
    filters: {
        statuses: FeatureRequestStatus[];
        priorities: FeatureRequestPriority[];
        github: GitHubFilterOption[];
        assignment: AssignmentFilterOption[];
        time: TimeFilterOption[];
        currentUserId?: string;
    }
): FeatureRequestClient[] {
    let filtered = requests;

    // Apply status filter
    filtered = filterByStatus(filtered, filters.statuses);

    // Apply priority filter
    filtered = filterByPriority(filtered, filters.priorities);

    // Apply GitHub filter
    filtered = filterByGitHub(filtered, filters.github);

    // Apply assignment filter
    filtered = filterByAssignment(filtered, filters.assignment, filters.currentUserId);

    // Apply time filter
    filtered = filterByTime(filtered, filters.time);

    return filtered;
}
