import { Card, CardContent } from '@/client/components/template/ui/card';

export type StatTone = 'default' | 'success' | 'warning' | 'destructive' | 'info';

const toneClass: Record<StatTone, string> = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    info: 'text-info',
};

interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    tone?: StatTone;
}

/** Compact metric tile shared across the admin agent/AI dashboards. */
export function StatCard({ label, value, sub, tone = 'default' }: StatCardProps) {
    return (
        <Card>
            <CardContent className="flex flex-col gap-1 p-4">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                </span>
                <span className={`text-2xl font-bold tabular-nums ${toneClass[tone]}`}>
                    {value}
                </span>
                {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
            </CardContent>
        </Card>
    );
}
