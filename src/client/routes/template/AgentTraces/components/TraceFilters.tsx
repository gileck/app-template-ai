import { Button } from '@/client/components/template/ui/button';
import type { AgentTraceStatus } from '@/apis/template/agent-admin/types';

interface TraceFiltersProps {
    view: 'recent' | 'stuck';
    status?: AgentTraceStatus;
    /** Navigate to the list with new filters encoded in the query string. */
    onChange: (next: { view: 'recent' | 'stuck'; status?: AgentTraceStatus }) => void;
}

const STATUSES: Array<{ value: AgentTraceStatus | undefined; label: string }> = [
    { value: undefined, label: 'All' },
    { value: 'started', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'errored', label: 'Errored' },
];

export function TraceFilters({ view, status, onChange }: TraceFiltersProps) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant={view === 'recent' ? 'default' : 'outline'}
                    className="min-h-11"
                    onClick={() => onChange({ view: 'recent', status })}
                >
                    Recent
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={view === 'stuck' ? 'default' : 'outline'}
                    className="min-h-11"
                    onClick={() => onChange({ view: 'stuck' })}
                >
                    Stuck
                </Button>
            </div>

            {view === 'recent' && (
                <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                        <Button
                            key={s.label}
                            type="button"
                            size="sm"
                            variant={status === s.value ? 'secondary' : 'ghost'}
                            className="min-h-11"
                            onClick={() => onChange({ view: 'recent', status: s.value })}
                        >
                            {s.label}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
