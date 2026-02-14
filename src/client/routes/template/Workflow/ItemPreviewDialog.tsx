/**
 * ItemPreviewDialog
 *
 * Full modal dialog for previewing and acting on a workflow item.
 * Fetches item details, shows description, actions, history, and status changes.
 */

import { useState, useMemo } from 'react';
import { Loader2, ExternalLink, Clock, CheckCircle, Trash2, Copy, ArrowRightLeft, Archive } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/client/components/template/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/client/components/template/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/client/components/template/ui/select';
import { ConfirmDialog } from '@/client/components/template/ui/confirm-dialog';
import { toast } from '@/client/components/template/ui/toast';
import { useRouter } from '@/client/features';
import { useQueryClient } from '@tanstack/react-query';
import { useItemDetail, useApproveItem, useDeleteItem, useRouteItem, parseItemId } from '@/client/routes/template/ItemDetail/hooks';
import { useUpdateWorkflowStatus, useUpdateWorkflowFields } from './hooks';
import { WorkflowActionButtons } from './WorkflowActionButtons';
import { WorkflowHistory } from './WorkflowHistory';
import { StatusBadge } from './StatusBadge';
import { ALL_STATUSES } from './constants';
import type { WorkflowItem } from '@/apis/template/workflow/types';

export function ItemPreviewDialog({ itemId, onClose, workflowItems }: { itemId: string | null; onClose: () => void; workflowItems?: WorkflowItem[] }) {
    const { navigate } = useRouter();
    const queryClient = useQueryClient();
    const { item, isLoading } = useItemDetail(itemId || undefined);
    const { approveFeature, approveBug, isPending: isApproving } = useApproveItem();
    const { deleteFeature, deleteBug, isPending: isDeleting } = useDeleteItem();
    const { routeItem, isPending: isRouting } = useRouteItem();
    const updateStatusMutation = useUpdateWorkflowStatus();
    const updateFieldsMutation = useUpdateWorkflowFields();
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral confirm dialog state
    const [showApproveConfirm, setShowApproveConfirm] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral confirm dialog state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral post-approval routing state
    const [showRouting, setShowRouting] = useState(false);

    const isFeature = item?.type === 'feature';
    const title = item
        ? (isFeature
            ? item.feature!.title
            : item.report!.description?.split('\n')[0]?.slice(0, 100) || 'Bug Report')
        : '';
    const description = item
        ? (isFeature ? item.feature!.description : item.report!.description || '')
        : '';
    const status = item ? (isFeature ? item.feature!.status : item.report!.status) : '';
    const createdAt = item ? (isFeature ? item.feature!.createdAt : item.report!.createdAt) : '';
    const isNew = status === 'new';
    const isAlreadySynced = item
        ? (isFeature ? !!item.feature!.githubIssueUrl : !!item.report!.githubIssueUrl)
        : false;
    const canApprove = isNew && !isAlreadySynced;

    const isWorkflowItem = itemId ? !itemId.includes(':') : false;

    const matchedWorkflowItem = useMemo(() => {
        if (!workflowItems || !itemId) return null;
        if (isWorkflowItem) {
            return workflowItems.find((wi) => wi.id === itemId) || null;
        }
        return workflowItems.find((wi) => wi.sourceId === itemId) || null;
    }, [workflowItems, itemId, isWorkflowItem]);

    const workflowItemId = isWorkflowItem ? itemId : (matchedWorkflowItem?.id || null);
    const { mongoId } = itemId ? parseItemId(itemId) : { mongoId: '' };

    const handleCopyDetails = async () => {
        if (!item) return;
        const lines: string[] = [];
        lines.push(`[${isFeature ? 'Feature' : 'Bug'}] ${title}`);
        lines.push(`Status: ${status}`);
        if (isFeature && item.feature!.priority) lines.push(`Priority: ${item.feature!.priority}`);
        if (createdAt) lines.push(`Created: ${new Date(createdAt).toLocaleDateString()}`);
        if (isFeature && item.feature!.requestedByName) lines.push(`Requested by: ${item.feature!.requestedByName}`);
        if (!isFeature && item.report!.route) lines.push(`Route: ${item.report!.route}`);
        if (description) {
            lines.push('');
            lines.push(description);
        }
        if (!isFeature && item.report!.errorMessage) {
            lines.push('');
            lines.push(`Error: ${item.report!.errorMessage}`);
        }
        const ghUrl = isFeature ? item.feature!.githubIssueUrl : item.report!.githubIssueUrl;
        if (ghUrl) {
            lines.push('');
            lines.push(`GitHub: ${ghUrl}`);
        }
        try {
            await navigator.clipboard.writeText(lines.join('\n'));
            toast.success('Details copied to clipboard');
        } catch {
            toast.error('Failed to copy');
        }
    };

    const handleApprove = async () => {
        try {
            let result;
            if (isFeature) {
                result = await approveFeature(mongoId);
            } else {
                result = await approveBug(mongoId);
            }
            setShowApproveConfirm(false);
            queryClient.invalidateQueries({ queryKey: ['workflow-items'] });

            if (isFeature && result?.needsRouting) {
                toast.success('Approved — choose where to route');
                setShowRouting(true);
                return;
            }

            toast.success('Item approved and synced to GitHub');
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to approve');
        }
    };

    const handleApproveToBacklog = async () => {
        try {
            if (isFeature) {
                await approveFeature(mongoId, true);
            } else {
                await approveBug(mongoId, true);
            }
            toast.success('Approved and moved to Backlog');
            onClose();
            queryClient.invalidateQueries({ queryKey: ['workflow-items'] });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to approve');
        }
    };

    const handleRoute = async (routeStatus: string) => {
        try {
            const sourceType = isFeature ? 'feature' : 'bug';
            const sourceId = itemId!;
            await routeItem({ sourceId, sourceType, status: routeStatus });
            toast.success(`Routed to ${routeStatus}`);
            onClose();
            setShowRouting(false);
            queryClient.invalidateQueries({ queryKey: ['workflow-items'] });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to route');
        }
    };

    const handleDelete = async () => {
        try {
            if (isFeature) {
                await deleteFeature(mongoId);
            } else {
                await deleteBug(mongoId);
            }
            toast.success('Item deleted');
            setShowDeleteConfirm(false);
            onClose();
            queryClient.invalidateQueries({ queryKey: ['workflow-items'] });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete');
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!workflowItemId) return;
        try {
            await updateStatusMutation.mutateAsync({ itemId: workflowItemId, status: newStatus });
            toast.success(`Moved to ${newStatus}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update status');
        }
    };

    const handleFieldChange = async (field: 'priority' | 'size' | 'complexity', value: string) => {
        if (!workflowItemId) return;
        try {
            await updateFieldsMutation.mutateAsync({
                itemId: workflowItemId,
                fields: { [field]: value === 'none' ? null : value },
            });
            toast.success(`${field} updated`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : `Failed to update ${field}`);
        }
    };

    return (
        <Dialog open={!!itemId} onOpenChange={(open) => { if (!open) { setShowRouting(false); onClose(); } }}>
            <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : !item ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        Item not found.
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5 mb-2 min-w-0">
                                    <StatusBadge label={isFeature ? 'Feature' : 'Bug'} colorKey={item.type} />
                                    <StatusBadge label={status} />
                                    {matchedWorkflowItem?.priority ? (
                                        <StatusBadge label={matchedWorkflowItem.priority} colorKey={matchedWorkflowItem.priority} />
                                    ) : isFeature && item.feature!.priority ? (
                                        <StatusBadge label={item.feature!.priority} colorKey={item.feature!.priority} />
                                    ) : null}
                                    {matchedWorkflowItem?.size && (
                                        <StatusBadge label={matchedWorkflowItem.size} colorKey={matchedWorkflowItem.size} />
                                    )}
                                    {matchedWorkflowItem?.complexity && (
                                        <StatusBadge label={matchedWorkflowItem.complexity} colorKey={matchedWorkflowItem.complexity} />
                                    )}
                                    {isFeature && item.feature!.source && (
                                        <StatusBadge label={`via ${item.feature!.source}`} colorKey="source" />
                                    )}
                                    {!isFeature && item.report!.source && (
                                        <StatusBadge label={`via ${item.report!.source}`} colorKey="source" />
                                    )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0 mr-6">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={handleCopyDetails}
                                        title="Copy details"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => {
                                            onClose();
                                            navigate(`/admin/item/${itemId}`);
                                        }}
                                        title="View full details"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <DialogTitle className="text-base leading-snug pr-6">{title}</DialogTitle>
                            {createdAt && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                    <Clock className="h-3 w-3 shrink-0" />
                                    <span>{new Date(createdAt).toLocaleDateString()}</span>
                                    {isFeature && item.feature!.requestedByName && (
                                        <span>by {item.feature!.requestedByName}</span>
                                    )}
                                    {!isFeature && item.report!.route && (
                                        <span>on {item.report!.route}</span>
                                    )}
                                </div>
                            )}
                        </DialogHeader>

                        <div className="overflow-y-auto flex-1 min-h-0 -mx-6 px-6 py-2">
                            {description && (
                                <div className="markdown-body text-sm mb-4">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {description}
                                    </ReactMarkdown>
                                </div>
                            )}

                            {!isFeature && item.report!.errorMessage && (
                                <div className="mb-4">
                                    <p className="text-xs font-medium text-destructive mb-1">Error Message</p>
                                    <code className="block text-xs bg-muted p-2 rounded overflow-auto">
                                        {item.report!.errorMessage}
                                    </code>
                                </div>
                            )}

                            {!isFeature && item.report!.stackTrace && (
                                <div className="mb-4">
                                    <p className="text-xs font-medium text-destructive mb-1">Stack Trace</p>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                                        {item.report!.stackTrace}
                                    </pre>
                                </div>
                            )}

                            {(() => {
                                const ghUrl = isFeature
                                    ? item.feature!.githubIssueUrl
                                    : item.report!.githubIssueUrl;
                                if (!ghUrl) return null;
                                return (
                                    <p className="text-xs text-muted-foreground mb-4">
                                        GitHub:{' '}
                                        <a
                                            href={ghUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary underline"
                                        >
                                            View Issue
                                        </a>
                                    </p>
                                );
                            })()}
                        </div>

                        <div className="pt-3 border-t -mx-6 px-6 flex flex-col gap-2">
                            {workflowItemId && matchedWorkflowItem?.status && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground shrink-0">{matchedWorkflowItem.status}</span>
                                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <Select
                                        value=""
                                        onValueChange={handleStatusChange}
                                    >
                                        <SelectTrigger className="h-8 text-xs flex-1">
                                            <SelectValue placeholder="Move to..." />
                                        </SelectTrigger>
                                        <SelectContent className="z-[70]">
                                            {ALL_STATUSES.map((s) => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {workflowItemId && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Select
                                        value={matchedWorkflowItem?.priority || 'none'}
                                        onValueChange={(v) => handleFieldChange('priority', v)}
                                    >
                                        <SelectTrigger className="h-7 text-xs w-auto min-w-[90px]">
                                            <SelectValue placeholder="Priority" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[70]">
                                            <SelectItem value="none">No priority</SelectItem>
                                            <SelectItem value="critical">Critical</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={matchedWorkflowItem?.size || 'none'}
                                        onValueChange={(v) => handleFieldChange('size', v)}
                                    >
                                        <SelectTrigger className="h-7 text-xs w-auto min-w-[70px]">
                                            <SelectValue placeholder="Size" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[70]">
                                            <SelectItem value="none">No size</SelectItem>
                                            <SelectItem value="XS">XS</SelectItem>
                                            <SelectItem value="S">S</SelectItem>
                                            <SelectItem value="M">M</SelectItem>
                                            <SelectItem value="L">L</SelectItem>
                                            <SelectItem value="XL">XL</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={matchedWorkflowItem?.complexity || 'none'}
                                        onValueChange={(v) => handleFieldChange('complexity', v)}
                                    >
                                        <SelectTrigger className="h-7 text-xs w-auto min-w-[100px]">
                                            <SelectValue placeholder="Complexity" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[70]">
                                            <SelectItem value="none">No complexity</SelectItem>
                                            <SelectItem value="High">High</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="Low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {matchedWorkflowItem && matchedWorkflowItem.content?.number && (
                                <WorkflowActionButtons
                                    item={matchedWorkflowItem}
                                    onActionComplete={onClose}
                                    excludeActions={workflowItemId ? ['mark-done'] : undefined}
                                />
                            )}

                            {matchedWorkflowItem?.history?.length ? (
                                <WorkflowHistory entries={matchedWorkflowItem.history} />
                            ) : null}

                            {showRouting && (
                                <div className="flex flex-col gap-2">
                                    <p className="text-xs text-muted-foreground">Choose where to route:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['Product Development', 'Product Design', 'Technical Design', 'Ready for development'].map((dest) => (
                                            <Button
                                                key={dest}
                                                variant="outline"
                                                size="sm"
                                                disabled={isRouting}
                                                onClick={() => handleRoute(dest)}
                                            >
                                                {isRouting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                                                {dest}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!showRouting && canApprove && (
                                <div className="flex gap-2">
                                    <Button
                                        className="flex-1"
                                        onClick={() => setShowApproveConfirm(true)}
                                        disabled={isApproving || isDeleting}
                                    >
                                        {isApproving ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                        )}
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleApproveToBacklog}
                                        disabled={isApproving || isDeleting}
                                    >
                                        <Archive className="mr-2 h-4 w-4" />
                                        Backlog
                                    </Button>
                                </div>
                            )}

                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={isApproving || isDeleting}
                            >
                                {isDeleting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Delete
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>

            <ConfirmDialog
                open={showApproveConfirm}
                onOpenChange={setShowApproveConfirm}
                title="Approve Item"
                description="This will create a GitHub issue and sync the item. Continue?"
                confirmText={isApproving ? 'Approving...' : 'Approve'}
                onConfirm={handleApprove}
            />
            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Delete Item"
                description="This will permanently delete this item from the database. This action cannot be undone."
                confirmText={isDeleting ? 'Deleting...' : 'Delete'}
                onConfirm={handleDelete}
                variant="destructive"
            />
        </Dialog>
    );
}
