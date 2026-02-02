/**
 * Dashboard Page Component
 *
 * Main analytics dashboard with metrics, charts, and activity feed.
 * Phase 1: Layout and core infrastructure with skeleton loading.
 */

import { Card } from '@/client/components/ui/card';
import { Alert, AlertDescription } from '@/client/components/ui/alert';
import { DashboardHeader, DashboardSkeleton } from './components';
import { useDashboardAnalytics } from './hooks';
import { Lightbulb, Bug, CheckCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/client/lib/utils';

/**
 * Format a number with appropriate suffix (K, M)
 */
function formatNumber(num: number): string {
    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
}

/**
 * Trend indicator component
 */
function TrendIndicator({ value, inverted = false }: { value: number; inverted?: boolean }) {
    const isPositive = inverted ? value < 0 : value > 0;
    const Icon = value > 0 ? TrendingUp : TrendingDown;

    return (
        <span
            className={cn(
                'flex items-center gap-0.5 text-xs font-medium',
                isPositive ? 'text-success' : 'text-destructive'
            )}
        >
            <Icon className="h-3 w-3" />
            {Math.abs(value).toFixed(1)}%
        </span>
    );
}

/**
 * Metric card component
 */
interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: number;
    trendInverted?: boolean;
    icon: React.ReactNode;
    iconBgColor: string;
}

function MetricCard({ title, value, subtitle, trend, trendInverted, icon, iconBgColor }: MetricCardProps) {
    return (
        <Card className="p-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{title}</span>
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', iconBgColor)}>
                    {icon}
                </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{value}</span>
                {trend !== undefined && <TrendIndicator value={trend} inverted={trendInverted} />}
            </div>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </Card>
    );
}

/**
 * Main Dashboard component
 */
export function Dashboard() {
    const { data, isLoading, error } = useDashboardAnalytics();

    // Loading state
    if (isLoading && !data) {
        return (
            <div className="mx-auto max-w-6xl py-4 px-2 sm:px-4">
                <DashboardSkeleton />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="mx-auto max-w-6xl py-4 px-2 sm:px-4">
                <DashboardHeader />
                <Alert variant="destructive" className="mt-4">
                    <AlertDescription>
                        Failed to load dashboard data: {error.message}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Empty state (no data)
    if (!data) {
        return (
            <div className="mx-auto max-w-6xl py-4 px-2 sm:px-4">
                <DashboardHeader />
                <Alert variant="info" className="mt-4">
                    <AlertDescription>
                        No data available for the selected date range. Try expanding the date range.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Build subtitle for feature requests
    const frSubtitle = data.featureRequests
        ? `${data.featureRequests.byStatus.new} new, ${data.featureRequests.byStatus.in_progress} in progress, ${data.featureRequests.byStatus.done} done`
        : undefined;

    // Build subtitle for bug reports
    const bugSubtitle = data.bugReports
        ? `${data.bugReports.byStatus.new} new, ${data.bugReports.byStatus.investigating} investigating, ${data.bugReports.byStatus.resolved} resolved`
        : undefined;

    // Build subtitle for agent metrics
    const agentSubtitle = data.agentMetrics
        ? `${formatNumber(data.agentMetrics.totalExecutions)} executions`
        : undefined;

    // Build subtitle for costs
    const costSubtitle = data.costs
        ? `Avg $${data.costs.avgPerExecution.toFixed(2)} per execution`
        : undefined;

    return (
        <div className="mx-auto max-w-6xl py-4 px-2 sm:px-4 pb-20 sm:pb-4">
            <DashboardHeader />

            {/* Metrics cards - 2 columns on mobile, 4 on desktop */}
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                    title="Feature Requests"
                    value={data.featureRequests?.total ?? 0}
                    subtitle={frSubtitle}
                    trend={data.featureRequests?.trend}
                    icon={<Lightbulb className="h-4 w-4 text-info" />}
                    iconBgColor="bg-info/10"
                />
                <MetricCard
                    title="Bug Reports"
                    value={data.bugReports?.total ?? 0}
                    subtitle={bugSubtitle}
                    trend={data.bugReports?.trend}
                    trendInverted // Lower bugs is better
                    icon={<Bug className="h-4 w-4 text-destructive" />}
                    iconBgColor="bg-destructive/10"
                />
                <MetricCard
                    title="Success Rate"
                    value={`${data.agentMetrics?.successRate ?? 0}%`}
                    subtitle={agentSubtitle}
                    trend={data.agentMetrics?.successRateTrend}
                    icon={<CheckCircle className="h-4 w-4 text-success" />}
                    iconBgColor="bg-success/10"
                />
                <MetricCard
                    title="Total Cost"
                    value={`$${data.costs?.total.toFixed(2) ?? '0.00'}`}
                    subtitle={costSubtitle}
                    trend={data.costs?.trend}
                    trendInverted // Lower cost is better
                    icon={<DollarSign className="h-4 w-4 text-warning" />}
                    iconBgColor="bg-warning/10"
                />
            </div>

            {/* Placeholder for charts (Phase 2) */}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                    <h3 className="text-lg font-medium">Feature Requests Over Time</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Chart coming in Phase 2
                    </p>
                    <div className="mt-4 h-48 flex items-center justify-center rounded-md bg-muted/50">
                        <span className="text-muted-foreground">Line Chart Placeholder</span>
                    </div>
                </Card>
                <Card className="p-4">
                    <h3 className="text-lg font-medium">Status Distribution</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Chart coming in Phase 2
                    </p>
                    <div className="mt-4 h-48 flex items-center justify-center rounded-md bg-muted/50">
                        <span className="text-muted-foreground">Pie Chart Placeholder</span>
                    </div>
                </Card>
            </div>

            {/* Placeholder for activity feed (Phase 3) */}
            <Card className="mt-4 p-4">
                <h3 className="text-lg font-medium">Recent Activity</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Activity feed coming in Phase 3
                </p>
                {data.activities && data.activities.length > 0 ? (
                    <div className="mt-4 space-y-3">
                        {data.activities.slice(0, 5).map((activity) => (
                            <div
                                key={activity.id}
                                className="flex items-start gap-3 rounded-md border border-border p-3"
                            >
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{activity.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(activity.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-4 h-32 flex items-center justify-center rounded-md bg-muted/50">
                        <span className="text-muted-foreground">No recent activity</span>
                    </div>
                )}
            </Card>
        </div>
    );
}
