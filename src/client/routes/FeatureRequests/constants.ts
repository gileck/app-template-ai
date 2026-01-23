/**
 * Feature Requests Constants
 *
 * Status colors, state machine transitions, health thresholds, and filter options.
 */

import type { FeatureRequestStatus, FeatureRequestPriority } from '@/apis/feature-requests/types';

/**
 * Status state machine - valid next states for each current status
 *
 * Supports both legacy and new statuses for backward compatibility.
 */
export const STATUS_TRANSITIONS: Record<FeatureRequestStatus, FeatureRequestStatus[]> = {
    // Legacy statuses
    new: ['proposed', 'approved', 'in_progress', 'backlog', 'rejected'],
    in_progress: ['waiting_for_review', 'blocked', 'done'],
    done: [], // Terminal state
    rejected: [], // Terminal state

    // New workflow statuses
    backlog: ['proposed', 'approved'],
    proposed: ['approved', 'backlog', 'rejected'],
    approved: ['in_progress', 'backlog'],
    waiting_for_review: ['done', 'in_progress'],
    blocked: ['in_progress', 'backlog'],
};

/**
 * Health indicator thresholds (in days)
 */
export const HEALTH_THRESHOLDS = {
    STALE_DAYS: 14, // No activity for this many days
    REVIEW_TOO_LONG_DAYS: 3, // Waiting for review too long
    PR_OPEN_TOO_LONG_DAYS: 7, // PR open for too long
} as const;

/**
 * Status strip colors for left border (Tailwind classes)
 *
 * Using semantic tokens where possible, with specific colors for new statuses.
 */
export const STATUS_STRIP_COLORS: Record<FeatureRequestStatus, string> = {
    // Legacy statuses
    new: 'border-l-purple-500',
    in_progress: 'border-l-blue-500',
    done: 'border-l-emerald-500',
    rejected: 'border-l-red-500',

    // New workflow statuses
    backlog: 'border-l-gray-500',
    proposed: 'border-l-purple-500',
    approved: 'border-l-green-500',
    waiting_for_review: 'border-l-orange-500',
    blocked: 'border-l-red-500',
};

/**
 * Priority badge colors (semantic tokens)
 */
export const PRIORITY_COLORS: Record<FeatureRequestPriority, string> = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-info/20 text-info',
    high: 'bg-warning/20 text-warning',
    critical: 'bg-destructive/20 text-destructive',
};

/**
 * Attention-based sort order (lower = higher priority)
 */
export const ATTENTION_SORT_ORDER: Record<FeatureRequestStatus, number> = {
    blocked: 1, // Highest priority
    waiting_for_review: 2,
    in_progress: 3,
    approved: 4,
    proposed: 5,
    new: 6,
    backlog: 7,
    done: 8,
    rejected: 9, // Lowest priority
};

/**
 * Priority sort order (lower = higher priority)
 */
export const PRIORITY_SORT_ORDER: Record<FeatureRequestPriority, number> = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
};

/**
 * Active statuses (excludes terminal states)
 */
export const ACTIVE_STATUSES: FeatureRequestStatus[] = [
    'new',
    'proposed',
    'backlog',
    'approved',
    'in_progress',
    'waiting_for_review',
    'blocked',
];

/**
 * GitHub filter options
 */
export type GitHubFilterOption = 'has_issue' | 'has_pr' | 'pr_merged';

/**
 * Assignment filter options
 */
export type AssignmentFilterOption = 'assigned_to_me' | 'no_owner';

/**
 * Time filter options
 */
export type TimeFilterOption = 'updated_recently' | 'stale';

/**
 * Sort mode options
 */
export type SortMode = 'attention' | 'priority' | 'date_newest' | 'date_oldest' | 'title_az';
