import type { ApiHandlerContext } from '@/apis/types';
import { getToolUsageStats } from '@/server/database/collections/template/agentConversations/messages';
import type { GetToolReportRequest, GetToolReportResponse } from '../types';
import { parseRange } from './shared';

export const getToolReport = async (
    request: GetToolReportRequest,
    context: ApiHandlerContext
): Promise<GetToolReportResponse> => {
    if (!context.isAdmin) {
        return { error: 'Admin access required' };
    }

    try {
        const range = parseRange(request);
        const rows = await getToolUsageStats(range);

        return {
            tools: rows.map((r) => ({
                ...r,
                successRate: r.results > 0 ? r.ok / r.results : 0,
            })),
        };
    } catch (error: unknown) {
        console.error('[admin/agent/getToolReport] error:', error);
        return {
            error:
                error instanceof Error
                    ? error.message
                    : 'Failed to load tool report',
        };
    }
};
