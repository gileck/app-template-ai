/**
 * Workflow Items Page
 *
 * Thin orchestrator for the workflow admin page.
 * Delegates rendering to extracted components.
 */

import { useMemo } from 'react';
import { ChevronsUpDown, Loader2, RefreshCw, CheckCircle, Trash2 } from 'lucide-react';
import { Button } from '@/client/components/template/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/client/components/template/ui/select';
import { ConfirmDialog } from '@/client/components/template/ui/confirm-dialog';
import { toast } from '@/client/components/template/ui/toast';
import { ErrorDisplay } from '@/client/features/template/error-tracking';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkflowItems } from './hooks';
import { useApproveItem, useDeleteItem, parseItemId } from '@/client/routes/template/ItemDetail/hooks';
import { useWorkflowPageStore } from './store';
import { StatsBar } from './StatsBar';
import { ViewTabs } from './ViewTabs';
import { CollapsibleSection } from './CollapsibleSection';
import { PendingCard } from './PendingCard';
import { WorkflowCard } from './WorkflowCard';
import { ItemPreviewDialog } from './ItemPreviewDialog';
import { KanbanBoard } from './KanbanBoard';
import { ActivityFeed } from './ActivityFeed';
import { PIPELINE_STATUSES, ALL_SECTION_KEYS } from './constants';
import type { TypeFilter, ViewFilter } from './store';
import type { WorkflowItem } from '@/apis/template/workflow/types';

const TYPE_LABELS: Record<TypeFilter, string> = {
    all: 'All types',
    feature: 'Features',
    bug: 'Bugs',
};

const VIEW_LABELS: Record<ViewFilter, string> = {
    all: 'All items',
    pending: 'Pending',
    active: 'Active',
    done: 'Done',
};

export function WorkflowItems() {
    const { data, isLoading, error, isFetching } = useWorkflowItems();

    const typeFilter = useWorkflowPageStore((s) => s.typeFilter);
    const viewFilter = useWorkflowPageStore((s) => s.viewFilter);
    const layoutMode = useWorkflowPageStore((s) => s.layoutMode);
    const collapsedSections = useWorkflowPageStore((s) => s.collapsedSections);
    const selectedItemId = useWorkflowPageStore((s) => s.selectedItemId);
    const selectMode = useWorkflowPageStore((s) => s.selectMode);
    const selectedItems = useWorkflowPageStore((s) => s.selectedItems);
    const showBulkDeleteConfirm = useWorkflowPageStore((s) => s.showBulkDeleteConfirm);
    const isBulkDeleting = useWorkflowPageStore((s) => s.isBulkDeleting);
    const isBulkApproving = useWorkflowPageStore((s) => s.isBulkApproving);

    const setTypeFilter = useWorkflowPageStore((s) => s.setTypeFilter);
    const setViewFilter = useWorkflowPageStore((s) => s.setViewFilter);
    const setLayoutMode = useWorkflowPageStore((s) => s.setLayoutMode);
    const toggleSection = useWorkflowPageStore((s) => s.toggleSection);
    const toggleAllSections = useWorkflowPageStore((s) => s.toggleAllSections);
    const setSelectedItemId = useWorkflowPageStore((s) => s.setSelectedItemId);
    const toggleSelectMode = useWorkflowPageStore((s) => s.toggleSelectMode);
    const toggleItemSelect = useWorkflowPageStore((s) => s.toggleItemSelect);
    const setShowBulkDeleteConfirm = useWorkflowPageStore((s) => s.setShowBulkDeleteConfirm);
    const resetBulkDelete = useWorkflowPageStore((s) => s.resetBulkDelete);
    const setIsBulkDeleting = useWorkflowPageStore((s) => s.setIsBulkDeleting);
    const setIsBulkApproving = useWorkflowPageStore((s) => s.setIsBulkApproving);

    const queryClient = useQueryClient();
    const { deleteFeature, deleteBug } = useDeleteItem();
    const { approveFeature, approveBug } = useApproveItem();

    const isBulkBusy = isBulkDeleting || isBulkApproving;

    const allSelectedArePending = useMemo(() => {
        const keys = Object.keys(selectedItems);
        return keys.length > 0 && keys.every((k) => k.startsWith('pending:'));
    }, [selectedItems]);

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true);
        let successCount = 0;
        let failCount = 0;
        let lastError = '';

        for (const key of Object.keys(selectedItems)) {
            const { type, mongoId } = selectedItems[key];
            try {
                if (type === 'feature') {
                    await deleteFeature(mongoId);
                } else {
                    await deleteBug(mongoId);
                }
                successCount++;
            } catch (err) {
                failCount++;
                lastError = err instanceof Error ? err.message : 'Unknown error';
            }
        }

        resetBulkDelete();
        queryClient.invalidateQueries({ queryKey: ['workflow-items'] });

        if (failCount > 0 && successCount === 0) {
            toast.error(`Failed to delete ${failCount} item${failCount !== 1 ? 's' : ''}: ${lastError}`);
        } else if (failCount > 0) {
            toast.error(`Deleted ${successCount}, failed ${failCount}: ${lastError}`);
        } else {
            toast.success(`Deleted ${successCount} item${successCount !== 1 ? 's' : ''}`);
        }
    };

    const handleBulkApprove = async () => {
        setIsBulkApproving(true);
        let successCount = 0;
        let failCount = 0;
        let lastError = '';

        for (const key of Object.keys(selectedItems)) {
            const { type, mongoId } = selectedItems[key];
            try {
                if (type === 'feature') {
                    await approveFeature(mongoId);
                } else {
                    await approveBug(mongoId);
                }
                successCount++;
            } catch (err) {
                failCount++;
                lastError = err instanceof Error ? err.message : 'Unknown error';
            }
        }

        resetBulkDelete();
        queryClient.invalidateQueries({ queryKey: ['workflow-items'] });

        if (failCount > 0 && successCount === 0) {
            toast.error(`Failed to approve ${failCount} item${failCount !== 1 ? 's' : ''}: ${lastError}`);
        } else if (failCount > 0) {
            toast.error(`Approved ${successCount}, failed ${failCount}: ${lastError}`);
        } else {
            toast.success(`Approved ${successCount} item${successCount !== 1 ? 's' : ''}`);
        }
    };

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['workflow-items'] });
    };

    const toggleAll = () => toggleAllSections(ALL_SECTION_KEYS);

    const isListView = layoutMode === 'list';
    const isBoardView = layoutMode === 'board';
    const isActivityView = layoutMode === 'activity';

    const filteredPending = useMemo(() => {
        if (!data?.pendingItems) return [];
        if (!isListView) return [];
        if (viewFilter !== 'all' && viewFilter !== 'pending') return [];
        const items = [...data.pendingItems].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        if (typeFilter === 'all') return items;
        return items.filter((item) => item.type === typeFilter);
    }, [data?.pendingItems, typeFilter, viewFilter]);

    const pipelineGroups = useMemo(() => {
        if (!data?.workflowItems) return [];
        if (!isListView) return [];
        if (viewFilter === 'pending' || viewFilter === 'done') return [];

        let items = [...data.workflowItems].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
        if (typeFilter !== 'all') {
            items = items.filter((item) => item.type === typeFilter);
        }
        items = items.filter((item) => item.status !== 'Done');

        const byStatus = new Map<string, WorkflowItem[]>();
        for (const item of items) {
            const status = item.status || 'Unknown';
            const existing = byStatus.get(status);
            if (existing) existing.push(item);
            else byStatus.set(status, [item]);
        }

        const groups: { status: string; items: WorkflowItem[] }[] = [];
        for (const status of PIPELINE_STATUSES) {
            const statusItems = byStatus.get(status);
            if (statusItems && statusItems.length > 0) {
                groups.push({ status, items: statusItems });
                byStatus.delete(status);
            }
        }
        for (const [status, statusItems] of byStatus) {
            groups.push({ status, items: statusItems });
        }

        return groups;
    }, [data?.workflowItems, typeFilter, viewFilter]);

    const doneItems = useMemo(() => {
        if (!data?.workflowItems) return [];
        if (!isListView) return [];
        if (viewFilter === 'pending' || viewFilter === 'active') return [];

        let items = data.workflowItems
            .filter((item) => item.status === 'Done')
            .sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
        if (typeFilter !== 'all') {
            items = items.filter((item) => item.type === typeFilter);
        }
        return items;
    }, [data?.workflowItems, typeFilter, viewFilter]);

    const allFilteredWorkflowItems = useMemo(() => {
        if (!data?.workflowItems) return [];
        if (typeFilter === 'all') return data.workflowItems;
        return data.workflowItems.filter((item) => item.type === typeFilter);
    }, [data?.workflowItems, typeFilter]);

    const statusCounts = useMemo(() => {
        if (!data?.workflowItems) return [];
        const counts = new Map<string, number>();
        for (const item of data.workflowItems) {
            const status = item.status || 'Unknown';
            counts.set(status, (counts.get(status) || 0) + 1);
        }
        const result: { status: string; count: number }[] = [];
        for (const status of [...PIPELINE_STATUSES, 'Done']) {
            const count = counts.get(status);
            if (count) {
                result.push({ status, count });
                counts.delete(status);
            }
        }
        for (const [status, count] of counts) {
            result.push({ status, count });
        }
        return result;
    }, [data?.workflowItems]);

    if (isLoading || data === undefined) {
        return (
            <div className="p-4">
                <h1 className="text-lg font-semibold mb-4">Workflow</h1>
                <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <h1 className="text-lg font-semibold mb-4">Workflow</h1>
                <ErrorDisplay error={error} title="Failed to load workflow items" variant="inline" />
            </div>
        );
    }

    const hasPending = filteredPending.length > 0;
    const hasPipelineGroups = pipelineGroups.length > 0;
    const hasDone = doneItems.length > 0;
    const isEmpty = isListView && !hasPending && !hasPipelineGroups && !hasDone;
    const selectedCount = Object.keys(selectedItems).length;
    const allCollapsed = collapsedSections.length > 0;

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-3">
                <h1 className="text-lg font-semibold">Workflow</h1>
                <div className="flex items-center gap-1.5">
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                        <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs px-3">
                            <SelectValue>{TYPE_LABELS[typeFilter]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All types</SelectItem>
                            <SelectItem value="feature">Features</SelectItem>
                            <SelectItem value="bug">Bugs</SelectItem>
                        </SelectContent>
                    </Select>
                    <button
                        onClick={toggleSelectMode}
                        disabled={isBulkBusy}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            selectMode
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        } ${isBulkBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {selectMode ? 'Cancel' : 'Select'}
                    </button>
                    <button
                        onClick={handleRefresh}
                        title="Refresh"
                        className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </button>
                    {isListView && (
                        <button
                            onClick={toggleAll}
                            title={allCollapsed ? 'Expand all' : 'Collapse all'}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                            <ChevronsUpDown className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <StatsBar
                pendingCount={data.pendingItems.length}
                statusCounts={statusCounts}
                onClickStatus={setViewFilter}
            />

            <div className="mb-4 flex items-center gap-2">
                <div className="flex-1">
                    <ViewTabs active={layoutMode} onChange={setLayoutMode} />
                </div>
                {isListView && (
                    <Select value={viewFilter} onValueChange={(v) => setViewFilter(v as ViewFilter)}>
                        <SelectTrigger className="h-8 w-auto min-w-[90px] text-xs px-3">
                            <SelectValue>{VIEW_LABELS[viewFilter]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All items</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            </div>

            {isActivityView ? (
                <ActivityFeed
                    workflowItems={data.workflowItems}
                    onSelectItem={setSelectedItemId}
                />
            ) : isBoardView ? (
                <KanbanBoard
                    items={allFilteredWorkflowItems}
                    onSelectItem={setSelectedItemId}
                />
            ) : (
                <>
                    {isEmpty && (
                        <div className="text-sm text-muted-foreground">No workflow items found.</div>
                    )}

                    {hasPending && (
                        <CollapsibleSection
                            title="Pending Approval"
                            count={filteredPending.length}
                            collapsed={collapsedSections.includes('pending')}
                            onToggle={() => toggleSection('pending')}
                        >
                            {filteredPending.map((item) => (
                                <PendingCard
                                    key={item.id}
                                    item={item}
                                    onSelect={setSelectedItemId}
                                    selectMode={selectMode}
                                    selected={`pending:${item.id}` in selectedItems}
                                    onToggleSelect={() => toggleItemSelect(`pending:${item.id}`, { type: item.type, mongoId: parseItemId(item.id).mongoId })}
                                />
                            ))}
                        </CollapsibleSection>
                    )}

                    {pipelineGroups.map((group) => (
                        <CollapsibleSection
                            key={group.status}
                            title={group.status}
                            count={group.items.length}
                            collapsed={collapsedSections.includes(group.status)}
                            onToggle={() => toggleSection(group.status)}
                        >
                            {group.items.map((item) => {
                                const sourceId = item.sourceId;
                                const canSelect = sourceId && (item.type === 'feature' || item.type === 'bug');
                                const { mongoId } = sourceId ? parseItemId(sourceId) : { mongoId: '' };
                                return (
                                    <WorkflowCard
                                        key={item.id}
                                        item={item}
                                        onSelect={setSelectedItemId}
                                        selectMode={selectMode && !!canSelect}
                                        selected={`workflow:${item.id}` in selectedItems}
                                        onToggleSelect={canSelect ? () => toggleItemSelect(`workflow:${item.id}`, { type: item.type as 'feature' | 'bug', mongoId }) : undefined}
                                    />
                                );
                            })}
                        </CollapsibleSection>
                    ))}

                    {hasDone && (
                        <CollapsibleSection
                            title="Done"
                            count={doneItems.length}
                            collapsed={collapsedSections.includes('Done')}
                            onToggle={() => toggleSection('Done')}
                        >
                            {doneItems.map((item) => {
                                const sourceId = item.sourceId;
                                const canSelect = sourceId && (item.type === 'feature' || item.type === 'bug');
                                const { mongoId } = sourceId ? parseItemId(sourceId) : { mongoId: '' };
                                return (
                                    <WorkflowCard
                                        key={item.id}
                                        item={item}
                                        onSelect={setSelectedItemId}
                                        selectMode={selectMode && !!canSelect}
                                        selected={`workflow:${item.id}` in selectedItems}
                                        onToggleSelect={canSelect ? () => toggleItemSelect(`workflow:${item.id}`, { type: item.type as 'feature' | 'bug', mongoId }) : undefined}
                                    />
                                );
                            })}
                        </CollapsibleSection>
                    )}
                </>
            )}

            {selectedCount > 0 && <div className="h-16" />}

            {selectedCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-3 z-50">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                            {selectedCount} selected
                        </span>
                        <div className="flex items-center gap-2">
                            {allSelectedArePending && (
                                <Button
                                    size="sm"
                                    onClick={handleBulkApprove}
                                    disabled={isBulkBusy}
                                >
                                    {isBulkApproving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                    )}
                                    {isBulkApproving ? 'Approving...' : 'Approve Selected'}
                                </Button>
                            )}
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setShowBulkDeleteConfirm(true)}
                                disabled={isBulkBusy}
                            >
                                {isBulkDeleting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ItemPreviewDialog
                itemId={selectedItemId}
                onClose={() => setSelectedItemId(null)}
                workflowItems={data?.workflowItems}
            />

            <ConfirmDialog
                open={showBulkDeleteConfirm}
                onOpenChange={setShowBulkDeleteConfirm}
                title="Delete Selected Items"
                description={`This will permanently delete ${selectedCount} item${selectedCount !== 1 ? 's' : ''}. This action cannot be undone.`}
                confirmText={isBulkDeleting ? 'Deleting...' : `Delete ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`}
                onConfirm={handleBulkDelete}
                variant="destructive"
            />
        </div>
    );
}
