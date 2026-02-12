/**
 * KanbanSection
 *
 * Collapsible accordion-style status section for the Kanban view.
 * Header with: status dot, label, count badge, chevron.
 * Expandable content area with item cards.
 */

import { ChevronDown, ChevronRight } from 'lucide-react';
import { BADGE_VARIANTS, DEFAULT_BADGE_VARIANT, type BadgeVariant } from './shared';
import { KanbanItemCard } from './KanbanItemCard';
import type { PendingItem, WorkflowItem } from '@/apis/template/workflow/types';

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

interface KanbanSectionProps {
    /** Status name (e.g., "Pending Approval", "Backlog", etc.) */
    status: string;
    /** Items in this section */
    items: (PendingItem | WorkflowItem)[];
    /** Whether items are pending (for KanbanItemCard) */
    isPending?: boolean;
    /** Whether this section is expanded */
    expanded: boolean;
    /** Toggle expand/collapse */
    onToggle: () => void;
    /** Select an item to view details */
    onSelectItem: (id: string) => void;
    /** Optional callback ref for scroll-to functionality */
    setRef?: (el: HTMLDivElement | null) => void;
}

export function KanbanSection({
    status,
    items,
    isPending,
    expanded,
    onToggle,
    onSelectItem,
    setRef,
}: KanbanSectionProps) {
    const variant = BADGE_VARIANTS[status] || DEFAULT_BADGE_VARIANT;
    const dotClass = VARIANT_DOT_CLASSES[variant];
    const count = items.length;

    return (
        <div ref={setRef} className="mb-3">
            {/* Section Header - 44px touch target */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors min-h-11"
            >
                {/* Status dot */}
                <span className={`w-2 h-2 rounded-full ${dotClass} shrink-0`} />

                {/* Status label */}
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-1 text-left">
                    {status}
                </span>

                {/* Count badge */}
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {count}
                </span>

                {/* Chevron */}
                {expanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
            </button>

            {/* Expandable content */}
            {expanded && items.length > 0 && (
                <div className="mt-2 pl-2 flex flex-col gap-2">
                    {items.map((item) => {
                        const key = 'status' in item && item.status !== null
                            ? (item as WorkflowItem).id
                            : (item as PendingItem).id;
                        return (
                            <KanbanItemCard
                                key={key}
                                item={item}
                                isPending={isPending}
                                onSelect={onSelectItem}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
