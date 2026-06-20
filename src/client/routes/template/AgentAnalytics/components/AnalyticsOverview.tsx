import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/client/components/template/ui/card';
import { Button } from '@/client/components/template/ui/button';
import {
    StatCard,
    formatUsd,
    formatTokens,
    formatNumber,
    formatPercent,
    formatDurationMs,
} from '@/client/features/template/agent-admin';
import type { AgentAnalytics } from '@/apis/template/agent-admin/types';

interface AnalyticsOverviewProps {
    analytics: AgentAnalytics;
    onViewStuck: () => void;
}

export function AnalyticsOverview({ analytics, onViewStuck }: AnalyticsOverviewProps) {
    const { turns, successRate, cost } = analytics;
    const successTone = successRate >= 0.9 ? 'success' : successRate >= 0.7 ? 'warning' : 'destructive';

    return (
        <div className="space-y-4">
            {analytics.stuckCount > 0 && (
                <Card className="border-warning/40 bg-warning/10">
                    <CardContent className="flex flex-wrap items-center gap-3 p-4">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" />
                        <p className="flex-1 text-sm text-foreground">
                            <span className="font-semibold">{analytics.stuckCount}</span>{' '}
                            agent turn{analytics.stuckCount === 1 ? '' : 's'} stuck mid-run
                            (likely a silent crash).
                        </p>
                        <Button variant="outline" size="sm" className="min-h-11" onClick={onViewStuck}>
                            Investigate
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Total Turns" value={formatNumber(turns.total)} />
                <StatCard
                    label="Success Rate"
                    value={formatPercent(successRate)}
                    sub={`${turns.completed} ok / ${turns.errored} errored`}
                    tone={successTone}
                />
                <StatCard
                    label="Avg Latency"
                    value={formatDurationMs(analytics.avgLatencyMs)}
                    sub={`${analytics.latencySampleCount} samples`}
                />
                <StatCard
                    label="Pending"
                    value={formatNumber(turns.pending)}
                    tone={turns.pending > 0 ? 'warning' : 'default'}
                />
                <StatCard label="Total Cost" value={formatUsd(cost.total)} />
                <StatCard label="Input Tokens" value={formatTokens(cost.inputTokens)} />
                <StatCard label="Output Tokens" value={formatTokens(cost.outputTokens)} />
                <StatCard
                    label="Errored"
                    value={formatNumber(turns.errored)}
                    tone={turns.errored > 0 ? 'destructive' : 'default'}
                />
            </div>

            <DailyCostBars data={analytics.dailyCost} />
        </div>
    );
}

function DailyCostBars({ data }: { data: AgentAnalytics['dailyCost'] }) {
    if (data.length === 0) return null;
    const recent = data.slice(-14);
    const max = Math.max(...recent.map((d) => d.cost), 0);

    return (
        <Card>
            <CardContent className="p-4">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Daily Cost
                </h2>
                <div className="flex flex-col gap-1.5">
                    {recent.map((d) => (
                        <div key={d.date} className="flex items-center gap-2 text-xs">
                            <span className="w-16 flex-shrink-0 text-muted-foreground tabular-nums">
                                {d.date.slice(5)}
                            </span>
                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${max > 0 ? (d.cost / max) * 100 : 0}%` }}
                                />
                            </div>
                            <span className="w-16 flex-shrink-0 text-right font-mono tabular-nums text-foreground">
                                {formatUsd(d.cost)}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
