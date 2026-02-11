/**
 * Workflow History Timeline
 *
 * Collapsible timeline showing lifecycle events for a workflow item.
 * Collapsed by default, shows newest entries first.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { WorkflowHistoryEntry } from '@/apis/template/workflow/types';

function formatRelativeTime(timestamp: string): string {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function WorkflowHistory({ entries }: { entries: WorkflowHistoryEntry[] }) {
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral collapse toggle
    const [expanded, setExpanded] = useState(false);

    if (!entries.length) return null;

    return (
        <div className="mt-3">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
                {expanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span className="font-medium">History ({entries.length})</span>
            </button>
            {expanded && (
                <div className="mt-2 ml-1 border-l-2 border-muted pl-3 flex flex-col gap-2">
                    {entries.map((entry, i) => (
                        <div key={i} className="text-xs">
                            <div className="flex items-baseline gap-2">
                                <span className="text-muted-foreground shrink-0">
                                    {formatRelativeTime(entry.timestamp)}
                                </span>
                                <span className="text-foreground">{entry.description}</span>
                                {entry.actor && (
                                    <span className="text-muted-foreground/60 shrink-0">
                                        {entry.actor}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
