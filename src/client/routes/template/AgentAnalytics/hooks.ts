/**
 * Agent Analytics Route Hooks
 *
 * Read-only admin page — query hooks only.
 */

import { useQuery } from '@tanstack/react-query';
import { getAgentAnalytics, getToolReport } from '@/apis/template/agent-admin/client';
import type {
    AgentAnalytics,
    ToolReportRow,
} from '@/apis/template/agent-admin/types';
import { useQueryDefaults } from '@/client/query';

const analyticsQueryKey = ['agent-admin', 'analytics'] as const;
const toolReportQueryKey = ['agent-admin', 'tool-report'] as const;

export function useAgentAnalytics() {
    const queryDefaults = useQueryDefaults();
    return useQuery({
        ...queryDefaults,
        queryKey: analyticsQueryKey,
        queryFn: async (): Promise<AgentAnalytics> => {
            const result = await getAgentAnalytics();
            if (result.data?.error) throw new Error(result.data.error);
            if (!result.data?.analytics) throw new Error('Analytics unavailable');
            return result.data.analytics;
        },
    });
}

export function useAgentToolReport() {
    const queryDefaults = useQueryDefaults();
    return useQuery({
        ...queryDefaults,
        queryKey: toolReportQueryKey,
        queryFn: async (): Promise<ToolReportRow[]> => {
            const result = await getToolReport();
            if (result.data?.error) throw new Error(result.data.error);
            return result.data?.tools ?? [];
        },
    });
}
