import type { ApiHandlerContext } from '@/apis/types';
import {
    getAssistantTurnStats,
    getCostByModel,
    getDailyAgentCost,
} from '@/server/database/collections/template/agentConversations/messages';
import {
    getTraceStatusCounts,
    getTraceLatencyStats,
    findStuckTracesAnyUser,
} from '@/server/database/collections/template/agentTraces/agentTraces';
import { STUCK_TRACE_THRESHOLD_MS } from '../index';
import type {
    GetAgentAnalyticsRequest,
    GetAgentAnalyticsResponse,
} from '../types';
import { parseRange } from './shared';

export const getAnalytics = async (
    request: GetAgentAnalyticsRequest,
    context: ApiHandlerContext
): Promise<GetAgentAnalyticsResponse> => {
    if (!context.isAdmin) {
        return { error: 'Admin access required' };
    }

    try {
        const range = parseRange(request);

        const [turns, byModel, dailyCost, traceStatus, latency, stuck] =
            await Promise.all([
                getAssistantTurnStats(range),
                getCostByModel(range),
                getDailyAgentCost(range),
                getTraceStatusCounts(range),
                getTraceLatencyStats(range),
                findStuckTracesAnyUser(STUCK_TRACE_THRESHOLD_MS, 500),
            ]);

        const finished = turns.completed + turns.errored;
        const successRate = finished > 0 ? turns.completed / finished : 0;

        return {
            analytics: {
                turns: {
                    total: turns.total,
                    completed: turns.completed,
                    errored: turns.errored,
                    pending: turns.pending,
                },
                successRate,
                avgLatencyMs: latency.avgMs,
                latencySampleCount: latency.count,
                cost: {
                    total: turns.totalCost,
                    inputTokens: turns.totalInputTokens,
                    outputTokens: turns.totalOutputTokens,
                },
                byModel,
                dailyCost,
                traceStatus,
                stuckCount: stuck.length,
            },
        };
    } catch (error: unknown) {
        console.error('[admin/agent/getAnalytics] error:', error);
        return {
            error:
                error instanceof Error
                    ? error.message
                    : 'Failed to load agent analytics',
        };
    }
};
