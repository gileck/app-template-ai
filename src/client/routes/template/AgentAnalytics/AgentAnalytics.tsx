/**
 * Agent Analytics Page
 *
 * Admin-only. Real aggregations over the in-app agent's turns, costs and
 * traces (replaces the former seeded-random dashboard mock), plus a
 * per-tool reliability report. Reachable at /admin/agent-analytics.
 */

import { Loader2, AlertCircle, BarChart3 } from 'lucide-react';
import { useRouter } from '@/client/features';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/client/components/template/ui/alert';
import { useAgentAnalytics, useAgentToolReport } from './hooks';
import { AnalyticsOverview } from './components/AnalyticsOverview';
import { ByModelTable } from './components/ByModelTable';
import { ToolReportTable } from './components/ToolReportTable';

export function AgentAnalytics() {
    const { navigate } = useRouter();
    const analytics = useAgentAnalytics();
    const toolReport = useAgentToolReport();

    const isLoading = analytics.isLoading || toolReport.isLoading;
    const error = analytics.error || toolReport.error;

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-20 sm:py-8">
            <div className="mb-6 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Agent Analytics</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Real turn, cost and reliability metrics for the in-app agent.
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
                    <AlertTitle>Failed to load analytics</AlertTitle>
                    <AlertDescription>
                        {error instanceof Error ? error.message : 'Unknown error'}
                    </AlertDescription>
                </Alert>
            )}

            {!isLoading && !error && analytics.data && (
                <div className="space-y-6">
                    <AnalyticsOverview
                        analytics={analytics.data}
                        onViewStuck={() => navigate('/admin/agent-traces?view=stuck')}
                    />
                    <ByModelTable rows={analytics.data.byModel} />
                    {toolReport.data && <ToolReportTable rows={toolReport.data} />}
                </div>
            )}
        </div>
    );
}
