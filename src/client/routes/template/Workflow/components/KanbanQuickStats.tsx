/**
 * KanbanQuickStats
 *
 * Horizontal scrollable row of status pills for quick status overview.
 * Each pill shows: colored dot + count + abbreviated status label.
 * Only renders statuses with items (filters out empty statuses).
 */

import { BADGE_VARIANTS, DEFAULT_BADGE_VARIANT, type BadgeVariant } from './shared';

interface StatusCount {
    status: string;
    count: number;
}

interface KanbanQuickStatsProps {
    /** Array of status counts (only statuses with items) */
    statusCounts: StatusCount[];
    /** Number of pending approval items */
    pendingCount: number;
    /** Optional: scroll to a section when tapping a pill */
    onScrollToSection?: (status: string) => void;
}

// Abbreviations for space efficiency in the quick stats bar
const STATUS_ABBREVIATIONS: Record<string, string> = {
    'Pending Approval': 'Pending',
    'Product Development': 'Prod Dev',
    'Product Design': 'Design',
    'Bug Investigation': 'Investigating',
    'Technical Design': 'Tech Design',
    'Ready for development': 'Ready',
    'PR Review': 'PR',
    'Final Review': 'Final',
    'Done': 'Done',
    'Backlog': 'Backlog',
};

// Map variant to dot background color class
const VARIANT_DOT_CLASSES: Record<BadgeVariant, string> = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
    info: 'bg-info',
    muted: 'bg-muted-foreground',
};

export function KanbanQuickStats({ statusCounts, pendingCount, onScrollToSection }: KanbanQuickStatsProps) {
    // Build the list of pills: pending first, then other statuses
    const allPills: StatusCount[] = [];

    if (pendingCount > 0) {
        allPills.push({ status: 'Pending Approval', count: pendingCount });
    }

    // Add all non-zero status counts
    for (const sc of statusCounts) {
        if (sc.count > 0) {
            allPills.push(sc);
        }
    }

    if (allPills.length === 0) {
        return null;
    }

    return (
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 mb-3">
            <div className="flex gap-2 min-w-max pb-1">
                {allPills.map(({ status, count }) => {
                    const variant = BADGE_VARIANTS[status] || DEFAULT_BADGE_VARIANT;
                    const dotClass = VARIANT_DOT_CLASSES[variant];
                    const label = STATUS_ABBREVIATIONS[status] || status;

                    return (
                        <button
                            key={status}
                            onClick={() => onScrollToSection?.(status)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 hover:bg-muted transition-colors min-h-11"
                        >
                            <span className={`w-2 h-2 rounded-full ${dotClass} shrink-0`} />
                            <span className="text-xs font-medium text-foreground">{count}</span>
                            <span className="text-xs text-muted-foreground">{label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
