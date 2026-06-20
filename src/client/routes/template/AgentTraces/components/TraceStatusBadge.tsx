import type { AgentTraceStatus } from '@/apis/template/agent-admin/types';

const styles: Record<AgentTraceStatus, string> = {
    started: 'bg-warning/15 text-warning',
    completed: 'bg-success/15 text-success',
    errored: 'bg-destructive/15 text-destructive',
};

const labels: Record<AgentTraceStatus, string> = {
    started: 'In progress',
    completed: 'Completed',
    errored: 'Errored',
};

export function TraceStatusBadge({ status }: { status: AgentTraceStatus }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
        >
            {labels[status]}
        </span>
    );
}
