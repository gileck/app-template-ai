import type { ApiHandlerContext } from '@/apis/types';
import { getAIUsageBreakdown } from '@/server/template/ai-usage-monitoring';
import { getTopSpenders } from '@/server/database/collections/template/agentConversations/messages';
import type {
    GetAiUsageConsoleRequest,
    GetAiUsageConsoleResponse,
    AiUsageGroup,
} from '../types';
import { buildUsernameMap } from './shared';
import type { AIUsageGroupRow } from '@/server/template/ai-usage-monitoring/types';

const DEFAULT_MAX_RECORDS = 5000;

function toGroup(row: AIUsageGroupRow): AiUsageGroup {
    return {
        key: row.key,
        cost: row.totalCost,
        tokens: row.totalTokens,
        count: row.count,
    };
}

export const getCostConsole = async (
    request: GetAiUsageConsoleRequest,
    context: ApiHandlerContext
): Promise<GetAiUsageConsoleResponse> => {
    if (!context.isAdmin) {
        return { error: 'Admin access required' };
    }

    try {
        const maxRecords = Math.min(
            Math.max(request.maxRecords ?? DEFAULT_MAX_RECORDS, 1),
            10000
        );

        const [breakdown, spenders, usernames] = await Promise.all([
            getAIUsageBreakdown({ maxRecords }),
            getTopSpenders(undefined, 10),
            buildUsernameMap(),
        ]);

        return {
            console: {
                totals: {
                    cost: breakdown.totalCost,
                    tokens: breakdown.totalTokens,
                    promptTokens: breakdown.totalPromptTokens,
                    completionTokens: breakdown.totalCompletionTokens,
                    recordCount: breakdown.recordCount,
                    truncated: breakdown.truncated,
                },
                byModel: breakdown.byModel.map(toGroup),
                byProvider: breakdown.byProvider.map(toGroup),
                byEndpoint: breakdown.byEndpoint.map(toGroup),
                byDay: breakdown.byDay.map((d) => ({
                    date: d.date,
                    cost: d.totalCost,
                    tokens: d.totalTokens,
                    count: d.count,
                })),
                topSpenders: spenders.map((s) => ({
                    userId: s.userId,
                    username: usernames.get(s.userId) ?? 'Unknown',
                    cost: s.cost,
                    turns: s.turns,
                })),
            },
        };
    } catch (error: unknown) {
        console.error('[admin/agent/getCostConsole] error:', error);
        return {
            error:
                error instanceof Error
                    ? error.message
                    : 'Failed to load AI usage console',
        };
    }
};
