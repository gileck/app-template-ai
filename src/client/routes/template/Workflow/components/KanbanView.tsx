/**
 * KanbanView (Placeholder for Phase 2)
 *
 * Mobile-first kanban board view for visualizing workflow pipeline.
 * Will be implemented in Phase 2.
 *
 * Features planned:
 * - Vertical accordion layout on mobile (not horizontal scroll)
 * - Expandable status columns
 * - Drag-and-drop reordering (desktop)
 * - Tap-to-move on mobile
 */

import { LayoutGrid } from 'lucide-react';
import type { PendingItem, WorkflowItem } from '@/apis/template/workflow/types';

interface KanbanViewProps {
    /** Filtered pending items */
    filteredPending: PendingItem[];
    /** Grouped pipeline items by status */
    pipelineGroups: { status: string; items: WorkflowItem[] }[];
    /** Done items */
    doneItems: WorkflowItem[];
    /** Select an item to view details */
    onSelectItem: (id: string) => void;
}

export function KanbanView({ filteredPending, pipelineGroups, doneItems, onSelectItem }: KanbanViewProps) {
    // Count total items
    const totalItems = filteredPending.length +
        pipelineGroups.reduce((sum, g) => sum + g.items.length, 0) +
        doneItems.length;

    // Placeholder for Phase 2 implementation
    // Suppress unused variable warnings
    void onSelectItem;

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <LayoutGrid className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
                Kanban Board View
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
                Visual board with status columns for tracking workflow progress.
                Mobile-first design with vertical accordion layout.
            </p>
            <p className="text-xs text-muted-foreground">
                {totalItems} items • Coming in Phase 2
            </p>
        </div>
    );
}
