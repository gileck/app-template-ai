import type { ApiHandlerContext } from '@/apis/types';
import {
    findRecentTracesAnyUser,
    findStuckTracesAnyUser,
} from '@/server/database/collections/template/agentTraces/agentTraces';
import { toStringId } from '@/server/template/utils';
import type { AgentTraceDocument } from '@/server/database/collections/template/agentTraces/types';
import { STUCK_TRACE_THRESHOLD_MS } from '../index';
import type {
    ListAgentTracesRequest,
    ListAgentTracesResponse,
    AgentTraceListRow,
} from '../types';
import { buildUsernameMap } from './shared';

function lastErrorMessage(doc: AgentTraceDocument): string | null {
    for (let i = doc.entries.length - 1; i >= 0; i--) {
        if (doc.entries[i].level === 'error') return doc.entries[i].message;
    }
    return null;
}

function toRow(
    doc: AgentTraceDocument,
    usernames: Map<string, string>
): AgentTraceListRow {
    const durationMs = doc.finishedAt
        ? doc.finishedAt.getTime() - doc.startedAt.getTime()
        : null;
    return {
        id: toStringId(doc._id),
        conversationId: toStringId(doc.conversationId),
        userId: doc.userId,
        username: usernames.get(doc.userId) ?? 'Unknown',
        status: doc.status,
        startedAt: doc.startedAt.toISOString(),
        finishedAt: doc.finishedAt ? doc.finishedAt.toISOString() : null,
        durationMs,
        entryCount: doc.entries.length,
        lastError: lastErrorMessage(doc),
    };
}

export const listTraces = async (
    request: ListAgentTracesRequest,
    context: ApiHandlerContext
): Promise<ListAgentTracesResponse> => {
    if (!context.isAdmin) {
        return { error: 'Admin access required' };
    }

    try {
        const limit = Math.min(Math.max(request.limit ?? 100, 1), 500);

        // Always fetch the stuck set — it powers the banner count and (when
        // requested) the view itself.
        const stuck = await findStuckTracesAnyUser(STUCK_TRACE_THRESHOLD_MS, 500);

        const docs =
            request.view === 'stuck'
                ? stuck.slice(0, limit)
                : await findRecentTracesAnyUser({
                      status: request.status,
                      limit,
                  });

        const usernames = await buildUsernameMap();

        return {
            traces: docs.map((d) => toRow(d, usernames)),
            stuckCount: stuck.length,
        };
    } catch (error: unknown) {
        console.error('[admin/agent/listTraces] error:', error);
        return {
            error:
                error instanceof Error
                    ? error.message
                    : 'Failed to list traces',
        };
    }
};
