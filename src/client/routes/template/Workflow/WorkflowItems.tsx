/**
 * Workflow Items Page
 *
 * Admin page showing all workflow items with their statuses.
 * Read-only view - items are sorted by date (newest first).
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/client/components/template/ui/card';
import { Badge } from '@/client/components/template/ui/badge';
import { useRouter } from '@/client/features';
import { useWorkflowItems } from './hooks';
import type { WorkflowItem } from '@/apis/template/workflow/types';

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getTypeBadge(labels?: string[]): { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' } {
    if (labels?.includes('bug')) return { label: 'Bug', variant: 'destructive' };
    return { label: 'Feature', variant: 'default' };
}

function getStatusVariant(status: string | null): 'default' | 'destructive' | 'secondary' | 'outline' {
    if (!status) return 'outline';
    if (status === 'Done') return 'default';
    if (status === 'Backlog') return 'secondary';
    return 'outline';
}

function getReviewStatusVariant(reviewStatus: string | null): 'default' | 'destructive' | 'secondary' | 'outline' {
    if (!reviewStatus) return 'outline';
    if (reviewStatus === 'Approved') return 'default';
    if (reviewStatus === 'Request Changes' || reviewStatus === 'Rejected') return 'destructive';
    return 'secondary';
}

function WorkflowCard({ item }: { item: WorkflowItem }) {
    const { navigate } = useRouter();
    const typeBadge = getTypeBadge(item.content?.labels);

    return (
        <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate(`/admin/item/${item.id}`)}
        >
            <CardContent className="p-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium leading-tight line-clamp-2">
                            {item.content?.title || 'Untitled'}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {item.createdAt && (
                                <span className="text-xs text-muted-foreground">
                                    {formatDate(item.createdAt)}
                                </span>
                            )}
                            {item.content?.number && (
                                <span className="text-xs text-muted-foreground">
                                    #{item.content.number}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={typeBadge.variant} className="text-xs">
                            {typeBadge.label}
                        </Badge>
                        <Badge variant={getStatusVariant(item.status)} className="text-xs">
                            {item.status || 'No status'}
                        </Badge>
                        {item.reviewStatus && (
                            <Badge variant={getReviewStatusVariant(item.reviewStatus)} className="text-xs">
                                {item.reviewStatus}
                            </Badge>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function WorkflowItems() {
    const { data: items, isLoading, error } = useWorkflowItems();

    const sortedItems = useMemo(() => {
        if (!items) return [];
        return [...items].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
    }, [items]);

    if (isLoading || items === undefined) {
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
                <div className="text-sm text-destructive">
                    Failed to load workflow items: {error.message}
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="p-4">
                <h1 className="text-lg font-semibold mb-4">Workflow</h1>
                <div className="text-sm text-muted-foreground">No workflow items found.</div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <h1 className="text-lg font-semibold mb-4">Workflow</h1>
            <div className="flex flex-col gap-2">
                {sortedItems.map((item) => (
                    <WorkflowCard key={item.id} item={item} />
                ))}
            </div>
        </div>
    );
}
