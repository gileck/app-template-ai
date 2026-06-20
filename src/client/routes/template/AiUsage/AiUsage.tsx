/**
 * AI Cost & Token Console
 *
 * Admin-only. Surfaces the AI usage records written to S3 on every model
 * call (previously read by nobody): cost & tokens by model, provider and
 * endpoint, a daily trend, and per-user agent spend. Reachable at
 * /admin/ai-usage.
 */

import { Loader2, AlertCircle, DollarSign, Info } from 'lucide-react';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/client/components/template/ui/alert';
import {
    StatCard,
    formatUsd,
    formatTokens,
    formatNumber,
} from '@/client/features/template/agent-admin';
import { useAiUsageConsole } from './hooks';
import { UsageGroupTable } from './components/UsageGroupTable';
import { TopSpendersTable } from './components/TopSpendersTable';

export function AiUsage() {
    const { data, isLoading, error } = useAiUsageConsole();

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-20 sm:py-8">
            <div className="mb-6 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                    <h1 className="text-2xl font-bold text-foreground">AI Usage</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Cost & token usage across every AI model call.
                    </p>
                </div>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {!isLoading && error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Failed to load AI usage</AlertTitle>
                    <AlertDescription>
                        {error instanceof Error ? error.message : 'Unknown error'}
                    </AlertDescription>
                </Alert>
            )}

            {!isLoading && !error && data && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <StatCard label="Total Cost" value={formatUsd(data.totals.cost)} />
                        <StatCard label="Total Tokens" value={formatTokens(data.totals.tokens)} />
                        <StatCard label="Prompt Tokens" value={formatTokens(data.totals.promptTokens)} />
                        <StatCard label="Output Tokens" value={formatTokens(data.totals.completionTokens)} />
                    </div>

                    {data.totals.truncated && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Partial sample</AlertTitle>
                            <AlertDescription>
                                Showing the most recent {formatNumber(data.totals.recordCount)} usage
                                records (scan cap reached) — totals are a lower bound.
                            </AlertDescription>
                        </Alert>
                    )}

                    <UsageGroupTable title="By Model" keyLabel="Model" rows={data.byModel} />
                    <UsageGroupTable title="By Provider" keyLabel="Provider" rows={data.byProvider} />
                    <UsageGroupTable title="By Endpoint" keyLabel="Endpoint" rows={data.byEndpoint} />
                    <TopSpendersTable rows={data.topSpenders} />
                </div>
            )}
        </div>
    );
}
