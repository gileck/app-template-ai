import type { FeatureRequestClient, FeatureRequestStatus } from '@/apis/feature-requests/types';

interface StatusIndicatorStripProps {
    request: FeatureRequestClient;
    githubStatus?: string | null;
}

// Color mapping for GitHub statuses (hard-coded as per design spec)
const githubStatusColors: Record<string, string> = {
    'backlog': '#6B7280',
    'todo': '#3B82F6',
    'new': '#3B82F6',
    'in progress': '#F59E0B',
    'waiting for review': '#F59E0B',
    'blocked': '#EF4444',
    'done': '#10B981',
};

// Color mapping for database statuses (hard-coded as per design spec)
const dbStatusColors: Record<FeatureRequestStatus, string> = {
    'new': '#3B82F6',
    'in_progress': '#F59E0B',
    'done': '#10B981',
    'rejected': '#EF4444',
};

/**
 * Get status color based on GitHub status (if available) or database status (fallback)
 */
function getStatusColor(request: FeatureRequestClient, githubStatus?: string | null): string {
    // Use GitHub status if available
    if (request.githubProjectItemId && githubStatus) {
        return githubStatusColors[githubStatus.toLowerCase()] || '#6B7280';
    }

    // Fallback to DB status
    return dbStatusColors[request.status];
}

/**
 * 4px left-edge status indicator strip
 * Color represents GitHub Project status when linked, otherwise falls back to database status
 */
export function StatusIndicatorStrip({ request, githubStatus }: StatusIndicatorStripProps) {
    const color = getStatusColor(request, githubStatus);

    return (
        <div
            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
            style={{ backgroundColor: color }}
            aria-hidden="true"
        />
    );
}
