import type { FeatureRequestStatus } from '@/apis/feature-requests/types';

interface UserStatusBadgeProps {
    status: FeatureRequestStatus;
}

/**
 * User-friendly status labels (different from admin view)
 * Simplified to match MongoDB schema
 */
const userStatusConfig: Record<
    FeatureRequestStatus,
    { label: string; className: string }
> = {
    new: {
        label: 'Submitted',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    },
    in_progress: {
        label: 'In Progress',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    },
    done: {
        label: 'Completed',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    rejected: {
        label: 'Not Planned',
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    backlog: {
        label: 'Backlog',
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    },
    proposed: {
        label: 'Proposed',
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    },
    approved: {
        label: 'Approved',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    waiting_for_review: {
        label: 'Waiting for Review',
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    },
    blocked: {
        label: 'Blocked',
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
};

const unknownConfig = {
    label: 'Unknown',
    className: 'bg-muted text-muted-foreground',
};

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
    const config = userStatusConfig[status] ?? unknownConfig;

    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
        >
            {config.label}
        </span>
    );
}
