/**
 * TimelineView (Placeholder for Phase 3)
 *
 * Chronological activity stream showing workflow events.
 * Will be implemented in Phase 3.
 *
 * Features planned:
 * - Activity feed with emoji icons and timestamps
 * - Filter tabs for All Activity, Needs Action, Recent Changes
 * - Actor avatars for tracking who did what
 * - Relative timestamps (e.g., "2 hours ago")
 */

import { Activity } from 'lucide-react';
import type { PendingItem, WorkflowItem } from '@/apis/template/workflow/types';

interface TimelineViewProps {
    /** Filtered pending items */
    filteredPending: PendingItem[];
    /** Grouped pipeline items by status */
    pipelineGroups: { status: string; items: WorkflowItem[] }[];
    /** Done items */
    doneItems: WorkflowItem[];
    /** Select an item to view details */
    onSelectItem: (id: string) => void;
}

export function TimelineView({ filteredPending, pipelineGroups, doneItems, onSelectItem }: TimelineViewProps) {
    // Count total items
    const totalItems = filteredPending.length +
        pipelineGroups.reduce((sum, g) => sum + g.items.length, 0) +
        doneItems.length;

    // Placeholder for Phase 3 implementation
    // Suppress unused variable warnings
    void onSelectItem;

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
                Timeline View
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
                Chronological activity stream with emoji icons, actor avatars,
                and timestamps. Filter by activity type.
            </p>
            <p className="text-xs text-muted-foreground">
                {totalItems} items • Coming in Phase 3
            </p>
        </div>
    );
}
