import { Card, CardContent } from '@/client/components/template/ui/card';
import { ListTree } from 'lucide-react';
import {
    formatDurationMs,
    formatRelativeTime,
} from '@/client/features/template/agent-admin';
import type { AgentTraceListRow } from '@/apis/template/agent-admin/types';
import { TraceStatusBadge } from './TraceStatusBadge';

interface TraceListProps {
    rows: AgentTraceListRow[];
    onRowClick: (id: string) => void;
    emptyLabel: string;
}

export function TraceList({ rows, onRowClick, emptyLabel }: TraceListProps) {
    if (rows.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                    <ListTree className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{emptyLabel}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">User</th>
                                <th className="px-4 py-3 font-medium">Started</th>
                                <th className="px-4 py-3 text-right font-medium">Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr
                                    key={row.id}
                                    onClick={() => onRowClick(row.id)}
                                    className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/50"
                                >
                                    <td className="px-4 py-3">
                                        <TraceStatusBadge status={row.status} />
                                        {row.lastError && (
                                            <p className="mt-1 max-w-xs truncate text-xs text-destructive">
                                                {row.lastError}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-foreground break-words">
                                        {row.username}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {formatRelativeTime(row.startedAt)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                                        {formatDurationMs(row.durationMs)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
