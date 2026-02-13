/**
 * KanbanItemCard
 *
 * Compact card for items within Kanban sections.
 * Layout: Priority dot + Title (2-line clamp) + Type badge + Timestamp.
 * Tap to select/open detail sheet.
 */

import { StatusBadge, formatRelativeTime, BADGE_VARIANTS, DEFAULT_BADGE_VARIANT, type BadgeVariant } from './shared';
import type { PendingItem, WorkflowItem } from '@/apis/template/workflow/types';

// Map variant to dot background color class for priority
const VARIANT_DOT_CLASSES: Record<BadgeVariant, string> = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
    info: 'bg-info',
    muted: 'bg-muted-foreground',
};

interface KanbanItemCardProps {
    /** The item to display (can be pending or workflow item) */
    item: PendingItem | WorkflowItem;
    /** Whether this is a pending item */
    isPending?: boolean;
    /** Callback when card is tapped */
    onSelect: (id: string) => void;
}

export function KanbanItemCard({ item, isPending, onSelect }: KanbanItemCardProps) {
    // Extract common properties based on item type
    const isPendingItem = isPending || !('status' in item) || ('status' in item && item.status === null);

    let title: string;
    let type: 'feature' | 'bug' | 'task';
    let priority: string | undefined;
    let createdAt: string | null;
    let navId: string;

    if (isPendingItem) {
        const pending = item as PendingItem;
        title = pending.title;
        type = pending.type;
        priority = pending.priority;
        createdAt = pending.createdAt;
        navId = pending.id;
    } else {
        const workflow = item as WorkflowItem;
        title = workflow.content?.title || 'Untitled';
        type = workflow.type;
        priority = undefined; // Workflow items don't have priority displayed
        createdAt = workflow.createdAt;
        navId = workflow.sourceId || workflow.id;
    }

    // Priority dot color
    const priorityVariant = priority ? (BADGE_VARIANTS[priority] || DEFAULT_BADGE_VARIANT) : null;
    const priorityDotClass = priorityVariant ? VARIANT_DOT_CLASSES[priorityVariant] : null;

    // Type label
    const typeLabel = type === 'bug' ? 'Bug' : type === 'task' ? 'Task' : 'Feature';

    return (
        <button
            onClick={() => onSelect(navId)}
            className="w-full text-left p-3 rounded-lg bg-card hover:bg-accent/50 transition-colors border border-border/50 min-h-11"
        >
            <div className="flex gap-2">
                {/* Priority dot (only for items with priority) */}
                {priorityDotClass && (
                    <span className={`w-2 h-2 rounded-full ${priorityDotClass} mt-1.5 shrink-0`} />
                )}

                <div className="flex-1 min-w-0">
                    {/* Title - 2 line clamp */}
                    <p className="text-sm font-medium text-foreground leading-tight line-clamp-2 mb-2">
                        {title}
                    </p>

                    {/* Type badge + Timestamp row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge label={typeLabel} colorKey={type} />
                        {createdAt && (
                            <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(createdAt)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}
