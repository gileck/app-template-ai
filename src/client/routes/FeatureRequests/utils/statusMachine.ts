/**
 * Status Machine Utility
 *
 * State machine logic and validation for feature request statuses.
 */

import type { FeatureRequestStatus } from '@/apis/feature-requests/types';
import { STATUS_TRANSITIONS } from '../constants';

/**
 * Get valid next statuses for a given current status
 *
 * @param currentStatus - The current status
 * @returns Array of valid next statuses
 */
export function getValidNextStatuses(currentStatus: FeatureRequestStatus): FeatureRequestStatus[] {
    return STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if a status transition is valid
 *
 * @param fromStatus - The current status
 * @param toStatus - The desired next status
 * @returns True if transition is valid, false otherwise
 */
export function isValidTransition(
    fromStatus: FeatureRequestStatus,
    toStatus: FeatureRequestStatus
): boolean {
    const validNextStatuses = getValidNextStatuses(fromStatus);
    return validNextStatuses.includes(toStatus);
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: FeatureRequestStatus): string {
    const labels: Record<FeatureRequestStatus, string> = {
        // Legacy statuses
        new: 'New',
        in_progress: 'In Progress',
        done: 'Done',
        rejected: 'Rejected',

        // New workflow statuses
        backlog: 'Backlog',
        proposed: 'Proposed',
        approved: 'Approved',
        waiting_for_review: 'Waiting for Review',
        blocked: 'Blocked',
    };

    return labels[status] || status;
}

/**
 * Check if a status is a terminal state (no transitions allowed)
 */
export function isTerminalStatus(status: FeatureRequestStatus): boolean {
    return STATUS_TRANSITIONS[status].length === 0;
}

/**
 * Check if a status is an active (non-terminal) status
 */
export function isActiveStatus(status: FeatureRequestStatus): boolean {
    return !isTerminalStatus(status);
}
