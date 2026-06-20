/**
 * Agent Traces Route Hooks
 *
 * Read-only admin page — cross-user trace listing + single-trace detail.
 */

import { useQuery } from '@tanstack/react-query';
import { listAgentTraces, getAgentTrace } from '@/apis/template/agent-admin/client';
import type {
    AgentTraceDetail,
    AgentTraceListRow,
    AgentTraceStatus,
} from '@/apis/template/agent-admin/types';
import { useQueryDefaults } from '@/client/query';

export interface TraceListData {
    traces: AgentTraceListRow[];
    stuckCount: number;
}

export function useAgentTraces(view: 'recent' | 'stuck', status?: AgentTraceStatus) {
    const queryDefaults = useQueryDefaults();
    return useQuery({
        ...queryDefaults,
        queryKey: ['agent-admin', 'traces', view, status ?? 'all'] as const,
        queryFn: async (): Promise<TraceListData> => {
            const result = await listAgentTraces({ view, status });
            if (result.data?.error) throw new Error(result.data.error);
            return {
                traces: result.data?.traces ?? [],
                stuckCount: result.data?.stuckCount ?? 0,
            };
        },
    });
}

export function useAgentTrace(messageId: string | undefined) {
    const queryDefaults = useQueryDefaults();
    return useQuery({
        ...queryDefaults,
        enabled: !!messageId,
        queryKey: ['agent-admin', 'trace', messageId] as const,
        queryFn: async (): Promise<AgentTraceDetail> => {
            const result = await getAgentTrace({ messageId: messageId as string });
            if (result.data?.error) throw new Error(result.data.error);
            if (!result.data?.trace) throw new Error('Trace not found');
            return result.data.trace;
        },
    });
}
