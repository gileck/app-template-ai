/**
 * Agent Trace Explorer
 *
 * Admin-only. Cross-user listing of agent turn traces with stuck-turn
 * triage (turns stuck at 'started' = silent crash) and per-trace timeline
 * drill-in. Reachable at /admin/agent-traces (+ /:messageId for detail).
 * Filters live in the URL query string (?view=stuck&status=errored).
 */

import { Loader2, AlertCircle, AlertTriangle, ListTree } from 'lucide-react';
import { useRouter } from '@/client/features';
import { Button } from '@/client/components/template/ui/button';
import { Card, CardContent } from '@/client/components/template/ui/card';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/client/components/template/ui/alert';
import type { AgentTraceStatus } from '@/apis/template/agent-admin/types';
import { useAgentTraces } from './hooks';
import { TraceFilters } from './components/TraceFilters';
import { TraceList } from './components/TraceList';
import { TraceDetail } from './components/TraceDetail';

const STATUS_VALUES: AgentTraceStatus[] = ['started', 'completed', 'errored'];

function buildListUrl(next: { view: 'recent' | 'stuck'; status?: AgentTraceStatus }): string {
    const params: string[] = [];
    if (next.view === 'stuck') params.push('view=stuck');
    if (next.status) params.push(`status=${next.status}`);
    return `/admin/agent-traces${params.length ? `?${params.join('&')}` : ''}`;
}

export function AgentTraces() {
    const { routeParams, queryParams, navigate } = useRouter();

    if (routeParams.messageId) {
        return (
            <TraceDetail
                messageId={routeParams.messageId}
                onBack={() => navigate('/admin/agent-traces')}
            />
        );
    }

    const view = queryParams.view === 'stuck' ? 'stuck' : 'recent';
    const status = STATUS_VALUES.find((s) => s === queryParams.status);

    return <TracesListView view={view} status={status} navigate={navigate} />;
}

interface TracesListViewProps {
    view: 'recent' | 'stuck';
    status?: AgentTraceStatus;
    navigate: (path: string) => void;
}

function TracesListView({ view, status, navigate }: TracesListViewProps) {
    const { data, isLoading, error } = useAgentTraces(view, status);

    return (
        <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-20 sm:py-8">
            <div className="mb-6 flex items-center gap-2">
                <ListTree className="h-5 w-5 text-muted-foreground" />
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Agent Traces</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Per-turn execution traces. Stuck turns signal a silent crash.
                    </p>
                </div>
            </div>

            <div className="mb-4">
                <TraceFilters
                    view={view}
                    status={status}
                    onChange={(next) => navigate(buildListUrl(next))}
                />
            </div>

            {!isLoading && !error && data && data.stuckCount > 0 && view !== 'stuck' && (
                <Card className="mb-4 border-warning/40 bg-warning/10">
                    <CardContent className="flex flex-wrap items-center gap-3 p-4">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" />
                        <p className="flex-1 text-sm text-foreground">
                            <span className="font-semibold">{data.stuckCount}</span> stuck turn
                            {data.stuckCount === 1 ? '' : 's'} need attention.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="min-h-11"
                            onClick={() => navigate(buildListUrl({ view: 'stuck' }))}
                        >
                            View stuck
                        </Button>
                    </CardContent>
                </Card>
            )}

            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {!isLoading && error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Failed to load traces</AlertTitle>
                    <AlertDescription>
                        {error instanceof Error ? error.message : 'Unknown error'}
                    </AlertDescription>
                </Alert>
            )}

            {!isLoading && !error && data && (
                <TraceList
                    rows={data.traces}
                    onRowClick={(id) => navigate(`/admin/agent-traces/${id}`)}
                    emptyLabel={
                        view === 'stuck'
                            ? 'No stuck turns — everything finished cleanly.'
                            : 'No traces in this view yet.'
                    }
                />
            )}
        </div>
    );
}
