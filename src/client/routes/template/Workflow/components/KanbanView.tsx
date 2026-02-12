/**
 * KanbanView
 *
 * Mobile-first kanban board view for visualizing workflow pipeline.
 * Uses vertical accordion layout on mobile (collapsible status sections).
 *
 * Features:
 * - Quick stats bar with scrollable status pills
 * - Collapsible status sections
 * - Persisted expand/collapse state
 * - Empty state handling
 */

import { useEffect, useMemo, useRef, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import { useWorkflowPageStore } from '../store';
import { KanbanQuickStats } from './KanbanQuickStats';
import { KanbanSection } from './KanbanSection';
import { PIPELINE_STATUSES } from './shared';
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

// All possible Kanban section statuses in order
const KANBAN_STATUSES = ['Pending Approval', ...PIPELINE_STATUSES, 'Done'] as const;

export function KanbanView({ filteredPending, pipelineGroups, doneItems, onSelectItem }: KanbanViewProps) {
    // Store state
    const kanbanExpandedSections = useWorkflowPageStore((s) => s.kanbanExpandedSections);
    const toggleKanbanSection = useWorkflowPageStore((s) => s.toggleKanbanSection);
    const initKanbanSections = useWorkflowPageStore((s) => s.initKanbanSections);

    // Refs for scroll-to functionality
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Build a map of status -> items
    const statusItemsMap = useMemo(() => {
        const map = new Map<string, (PendingItem | WorkflowItem)[]>();

        // Pending items
        if (filteredPending.length > 0) {
            map.set('Pending Approval', filteredPending);
        }

        // Pipeline groups
        for (const group of pipelineGroups) {
            if (group.items.length > 0) {
                map.set(group.status, group.items);
            }
        }

        // Done items
        if (doneItems.length > 0) {
            map.set('Done', doneItems);
        }

        return map;
    }, [filteredPending, pipelineGroups, doneItems]);

    // Compute status counts for quick stats
    const statusCounts = useMemo(() => {
        const counts: { status: string; count: number }[] = [];
        for (const status of [...PIPELINE_STATUSES, 'Done']) {
            const items = statusItemsMap.get(status);
            if (items && items.length > 0) {
                counts.push({ status, count: items.length });
            }
        }
        return counts;
    }, [statusItemsMap]);

    // Statuses that have items (for initializing expanded state)
    const statusesWithItems = useMemo(() => {
        return Array.from(statusItemsMap.keys());
    }, [statusItemsMap]);

    // Initialize expanded sections on first render
    useEffect(() => {
        if (statusesWithItems.length > 0) {
            initKanbanSections(statusesWithItems);
        }
    }, [statusesWithItems, initKanbanSections]);

    // Check if a section is expanded (default to expanded if user hasn't interacted)
    const isSectionExpanded = useCallback((status: string): boolean => {
        // If store has sections set, use that
        if (kanbanExpandedSections.length > 0) {
            return kanbanExpandedSections.includes(status);
        }
        // Otherwise, default to expanded for sections with items
        return statusItemsMap.has(status);
    }, [kanbanExpandedSections, statusItemsMap]);

    // Scroll to section when clicking quick stats pill
    const handleScrollToSection = useCallback((status: string) => {
        const ref = sectionRefs.current[status];
        if (ref) {
            ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Also expand the section if it's collapsed
            if (!isSectionExpanded(status)) {
                toggleKanbanSection(status);
            }
        }
    }, [isSectionExpanded, toggleKanbanSection]);

    // Count total items
    const totalItems = filteredPending.length +
        pipelineGroups.reduce((sum, g) => sum + g.items.length, 0) +
        doneItems.length;

    // Empty state
    if (totalItems === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <ClipboardList className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                    No workflow items
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                    When users submit feature requests or bug reports, they will appear here for review and processing.
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Quick Stats Bar */}
            <KanbanQuickStats
                statusCounts={statusCounts}
                pendingCount={filteredPending.length}
                onScrollToSection={handleScrollToSection}
            />

            {/* Kanban Sections */}
            <div className="flex flex-col">
                {KANBAN_STATUSES.map((status) => {
                    const items = statusItemsMap.get(status);
                    // Skip empty sections
                    if (!items || items.length === 0) return null;

                    const isPending = status === 'Pending Approval';

                    return (
                        <KanbanSection
                            key={status}
                            status={status}
                            items={items}
                            isPending={isPending}
                            expanded={isSectionExpanded(status)}
                            onToggle={() => toggleKanbanSection(status)}
                            onSelectItem={onSelectItem}
                            setRef={(el) => { sectionRefs.current[status] = el; }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
