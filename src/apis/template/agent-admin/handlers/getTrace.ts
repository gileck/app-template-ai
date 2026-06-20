import type { ObjectId } from 'mongodb';
import type { ApiHandlerContext } from '@/apis/types';
import { findTraceByMessageIdAnyUser } from '@/server/database/collections/template/agentTraces/agentTraces';
import { findRpcJobBySourceMessageId } from '@/server/template/rpc/collection';
import { toQueryId, toStringId } from '@/server/template/utils';
import type { RpcJobError } from '@/server/database/collections/template/agentTraces/types';
import type { GetAgentTraceRequest, GetAgentTraceResponse } from '../types';
import { buildUsernameMap } from './shared';

export const getTrace = async (
    request: GetAgentTraceRequest,
    context: ApiHandlerContext
): Promise<GetAgentTraceResponse> => {
    if (!context.isAdmin) {
        return { error: 'Admin access required' };
    }
    if (!request.messageId) {
        return { error: 'messageId is required' };
    }

    try {
        const messageId = toQueryId(request.messageId) as ObjectId;
        const doc = await findTraceByMessageIdAnyUser(messageId);
        if (!doc) {
            return { error: 'Trace not found' };
        }

        const [usernames, job] = await Promise.all([
            buildUsernameMap(),
            findRpcJobBySourceMessageId(request.messageId),
        ]);

        const rpcJob: RpcJobError | undefined = job
            ? {
                  jobId: toStringId(job._id),
                  status: job.status,
                  error: job.error ?? null,
                  startedAt: job.startedAt ? job.startedAt.toISOString() : null,
                  completedAt: job.completedAt
                      ? job.completedAt.toISOString()
                      : null,
              }
            : undefined;

        const durationMs = doc.finishedAt
            ? doc.finishedAt.getTime() - doc.startedAt.getTime()
            : null;

        return {
            trace: {
                id: toStringId(doc._id),
                conversationId: toStringId(doc.conversationId),
                userId: doc.userId,
                username: usernames.get(doc.userId) ?? 'Unknown',
                status: doc.status,
                startedAt: doc.startedAt.toISOString(),
                finishedAt: doc.finishedAt ? doc.finishedAt.toISOString() : null,
                durationMs,
                entries: doc.entries,
                ...(rpcJob ? { rpcJob } : {}),
            },
        };
    } catch (error: unknown) {
        console.error('[admin/agent/getTrace] error:', error);
        return {
            error:
                error instanceof Error ? error.message : 'Failed to load trace',
        };
    }
};
