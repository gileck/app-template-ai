/**
 * StatsBar
 *
 * Summary stats bar showing counts per status with clickable filters.
 */

import type { ViewFilter } from './store';

const STATUS_DOT_CLASS: Record<string, string> = {
    'Pending Approval': 'bg-warning',
    'Backlog': 'bg-secondary',
    'Product Development': 'bg-secondary',
    'Product Design': 'bg-secondary',
    'Bug Investigation': 'bg-destructive',
    'Technical Design': 'bg-primary',
    'Ready for development': 'bg-warning',
    'PR Review': 'bg-primary',
    'Final Review': 'bg-primary',
    'Done': 'bg-success',
};

const DEFAULT_DOT_CLASS = 'bg-muted-foreground';

export function StatsBar({ pendingCount, statusCounts, onClickStatus }: {
    pendingCount: number;
    statusCounts: { status: string; count: number }[];
    onClickStatus: (view: ViewFilter) => void;
}) {
    const total = pendingCount + statusCounts.reduce((sum, s) => sum + s.count, 0);
    if (total === 0) return null;

    return (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
            {pendingCount > 0 && (
                <button
                    onClick={() => onClickStatus('pending')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    <span>Pending {pendingCount}</span>
                </button>
            )}
            {statusCounts.map(({ status, count }) => (
                <button
                    key={status}
                    onClick={() => onClickStatus(status === 'Done' ? 'done' : 'active')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT_CLASS[status] || DEFAULT_DOT_CLASS}`} />
                    <span>{status} {count}</span>
                </button>
            ))}
        </div>
    );
}
