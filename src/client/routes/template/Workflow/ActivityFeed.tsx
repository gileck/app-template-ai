/**
 * ActivityFeed
 *
 * Unified reverse-chronological feed of all history entries across all workflow items.
 * Groups entries by date: Today, Yesterday, Earlier this week, Older.
 */

import { useMemo } from 'react';
import { StatusBadge } from './StatusBadge';
import { formatRelativeTime, formatAction } from './utils';
import type { WorkflowItem, WorkflowHistoryEntry } from '@/apis/template/workflow/types';

interface FeedEntry extends WorkflowHistoryEntry {
    itemId: string;
    itemTitle: string;
    itemType: WorkflowItem['type'];
    issueNumber?: number;
}

function getDateGroup(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);

    if (date >= todayStart) return 'Today';
    if (date >= yesterdayStart) return 'Yesterday';
    if (date >= weekStart) return 'Earlier this week';
    return 'Older';
}

const DATE_GROUP_ORDER = ['Today', 'Yesterday', 'Earlier this week', 'Older'];

export function ActivityFeed({ workflowItems, onSelectItem }: {
    workflowItems: WorkflowItem[];
    onSelectItem: (id: string) => void;
}) {
    const grouped = useMemo(() => {
        const entries: FeedEntry[] = [];
        for (const item of workflowItems) {
            if (!item.history?.length) continue;
            const navId = item.sourceId || item.id;
            for (const entry of item.history) {
                entries.push({
                    ...entry,
                    itemId: navId,
                    itemTitle: item.content?.title || 'Untitled',
                    itemType: item.type,
                    issueNumber: item.content?.number,
                });
            }
        }
        entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Limit to 100 entries for performance
        const limited = entries.slice(0, 100);

        const groups = new Map<string, FeedEntry[]>();
        for (const entry of limited) {
            const group = getDateGroup(entry.timestamp);
            const existing = groups.get(group);
            if (existing) existing.push(entry);
            else groups.set(group, [entry]);
        }

        return DATE_GROUP_ORDER
            .filter((g) => groups.has(g))
            .map((g) => ({ label: g, entries: groups.get(g)! }));
    }, [workflowItems]);

    if (grouped.length === 0) {
        return <div className="text-sm text-muted-foreground py-4">No activity yet.</div>;
    }

    return (
        <div className="flex flex-col gap-4">
            {grouped.map(({ label, entries }) => (
                <div key={label}>
                    <div className="sticky top-0 bg-background z-10 py-1 mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</h3>
                    </div>
                    <div className="border-l-2 border-muted ml-1 pl-3 flex flex-col gap-3">
                        {entries.map((entry, i) => (
                            <div key={`${entry.itemId}-${entry.timestamp}-${i}`} className="text-xs">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-muted-foreground shrink-0">
                                        {formatRelativeTime(entry.timestamp)}
                                    </span>
                                    <StatusBadge
                                        label={entry.itemType === 'bug' ? 'Bug' : entry.itemType === 'task' ? 'Task' : 'Feature'}
                                        colorKey={entry.itemType}
                                    />
                                    {entry.issueNumber && (
                                        <span className="text-muted-foreground">#{entry.issueNumber}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => onSelectItem(entry.itemId)}
                                    className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left line-clamp-1"
                                >
                                    {entry.itemTitle}
                                </button>
                                <p className="text-muted-foreground mt-0.5">
                                    {formatAction(entry.action)}
                                    {entry.actor && <span className="opacity-60"> by {entry.actor}</span>}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
