import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/client/components/template/ui/button';
import { Card, CardContent } from '@/client/components/template/ui/card';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/client/components/template/ui/alert';
import {
    formatDurationMs,
    formatDateTime,
} from '@/client/features/template/agent-admin';
import type { TraceEntry } from '@/server/database/collections/template/agentTraces/types';
import { useAgentTrace } from '../hooks';
import { TraceStatusBadge } from './TraceStatusBadge';

const levelClass: Record<TraceEntry['level'], string> = {
    debug: 'text-muted-foreground',
    info: 'text-foreground',
    warn: 'text-warning',
    error: 'text-destructive',
};

export function TraceDetail({
    messageId,
    onBack,
}: {
    messageId: string;
    onBack: () => void;
}) {
    const { data: trace, isLoading, error } = useAgentTrace(messageId);

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-20 sm:py-8">
            <Button variant="ghost" size="sm" className="mb-4 min-h-11" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to traces
            </Button>

            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {!isLoading && error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Failed to load trace</AlertTitle>
                    <AlertDescription>
                        {error instanceof Error ? error.message : 'Unknown error'}
                    </AlertDescription>
                </Alert>
            )}

            {!isLoading && !error && trace && (
                <div className="space-y-4">
                    <Card>
                        <CardContent className="flex flex-col gap-2 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <TraceStatusBadge status={trace.status} />
                                <span className="text-sm font-medium text-foreground">
                                    {trace.username}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span>Started {formatDateTime(trace.startedAt)}</span>
                                <span>Duration {formatDurationMs(trace.durationMs)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {trace.rpcJob && trace.rpcJob.status === 'failed' && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>RPC job failed</AlertTitle>
                            <AlertDescription className="break-words">
                                {trace.rpcJob.error ?? 'The daemon reported a failure.'}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div>
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Timeline
                        </h2>
                        <Card>
                            <CardContent className="space-y-3 p-4">
                                {trace.entries.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No entries recorded.
                                    </p>
                                ) : (
                                    trace.entries.map((entry, i) => (
                                        <TraceEntryRow key={i} entry={entry} />
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

function TraceEntryRow({ entry }: { entry: TraceEntry }) {
    return (
        <div className="border-b border-border pb-3 text-sm last:border-b-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {entry.layer}
                </span>
                <span className={`font-mono text-xs ${levelClass[entry.level]}`}>
                    {entry.message}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(entry.at)}
                </span>
            </div>
            {entry.data != null && (
                <pre className="mt-1 overflow-x-auto rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                    {JSON.stringify(entry.data, null, 2)}
                </pre>
            )}
        </div>
    );
}
