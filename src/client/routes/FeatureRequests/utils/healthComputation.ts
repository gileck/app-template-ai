/**
 * Health Computation Utility
 *
 * Computes health indicators for feature requests based on staleness,
 * review delays, PR status, and ownership.
 */

import type { FeatureRequestClient } from '@/apis/feature-requests/types';
import type { GitHubIssueDetails } from '@/apis/feature-requests/types';
import { HEALTH_THRESHOLDS } from '../constants';

export type HealthStatus = 'healthy' | 'at_risk' | 'needs_attention';

export interface HealthIndicator {
    status: HealthStatus;
    reasons: string[];
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: string | Date, date2: Date = new Date()): number {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const diffTime = Math.abs(date2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Compute health indicator for a feature request
 *
 * @param request - The feature request to check
 * @param githubDetails - Optional GitHub issue details (for PR status)
 * @returns Health indicator with status and reasons
 */
export function computeFeatureRequestHealth(
    request: FeatureRequestClient,
    githubDetails?: GitHubIssueDetails
): HealthIndicator {
    const reasons: string[] = [];

    // Check staleness (based on lastActivityAt or updatedAt)
    const lastUpdate = request.lastActivityAt ?? request.updatedAt;
    const daysSinceUpdate = daysBetween(lastUpdate);
    if (daysSinceUpdate >= HEALTH_THRESHOLDS.STALE_DAYS) {
        reasons.push(`No activity for ${daysSinceUpdate} days`);
    }

    // Check review waiting time
    if (request.status === 'waiting_for_review' && request.statusChangedAt) {
        const daysInReview = daysBetween(request.statusChangedAt);
        if (daysInReview >= HEALTH_THRESHOLDS.REVIEW_TOO_LONG_DAYS) {
            reasons.push(`Waiting for review for ${daysInReview} days`);
        }
    }

    // Check PR state (if GitHub details available)
    if (githubDetails?.linkedPullRequests && githubDetails.linkedPullRequests.length > 0) {
        const openPRs = githubDetails.linkedPullRequests.filter((pr) => pr.state === 'OPEN');
        if (openPRs.length > 0) {
            // Check if any PR has been open too long
            // Note: We don't have PR creation date in the current type, so we skip this check
            // This could be enhanced if PR age data is added to the API response
            reasons.push(`${openPRs.length} PR(s) open`);
        }
    }

    // Check ownership
    // Note: Current type doesn't have assignedTo field - using requestedBy as proxy
    // This would need to be updated if an assignedTo field is added
    // if (!request.assignedTo) {
    //     reasons.push('No owner assigned');
    // }

    // Check blocked status
    if (request.status === 'blocked') {
        reasons.push('Status: Blocked');
    }

    // Determine overall health
    if (request.status === 'blocked' || reasons.length >= 3) {
        return { status: 'needs_attention', reasons };
    } else if (reasons.length >= 1) {
        return { status: 'at_risk', reasons };
    } else {
        return { status: 'healthy', reasons: [] };
    }
}

/**
 * Get a human-readable label for health status
 */
export function getHealthStatusLabel(status: HealthStatus): string {
    switch (status) {
        case 'healthy':
            return 'Healthy';
        case 'at_risk':
            return 'At Risk';
        case 'needs_attention':
            return 'Needs Attention';
    }
}

/**
 * Get Tailwind color class for health status indicator
 */
export function getHealthStatusColor(status: HealthStatus): string {
    switch (status) {
        case 'healthy':
            return 'bg-success';
        case 'at_risk':
            return 'bg-warning';
        case 'needs_attention':
            return 'bg-destructive';
    }
}
