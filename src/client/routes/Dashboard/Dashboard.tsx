/**
 * Dashboard Page Component
 *
 * Main analytics dashboard with metrics, charts, and activity feed.
 * Phase 2: Added metrics cards and interactive charts.
 */

import { Card } from '@/client/components/ui/card';
import { Alert, AlertDescription } from '@/client/components/ui/alert';
import { DashboardHeader, DashboardSkeleton, MetricsSection, ChartsSection } from './components';
import { useDashboardAnalytics } from './hooks';

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

    return (
        <div className="mx-auto max-w-6xl py-4 px-2 sm:px-4 pb-20 sm:pb-4">
            <DashboardHeader />

            {/* Metrics cards - 2 columns on mobile, 4 on desktop */}
            <div className="mt-4">
                <MetricsSection data={data} />
            </div>

            {/* Interactive charts - 1 column on mobile, 2 on desktop */}
            <div className="mt-4">
                <ChartsSection data={data} />
            </div>

            {/* Placeholder for activity feed (Phase 3) */}
            <Card className="mt-4 p-4">
                <h3 className="text-lg font-medium">Recent Activity</h3>
                <p className="text-sm text-muted-foreground">
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
