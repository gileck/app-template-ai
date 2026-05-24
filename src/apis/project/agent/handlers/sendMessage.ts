/**
 * Send a message in an agent conversation.
 *
 * Vercel-side entry point. The happy path:
 *   1. Create the user message row
 *   2. Create a pending assistant message stub (shared ObjectId with
 *      the trace + `sourceMessageId` for the RPC)
 *   3. Open the agent trace
 *   4. Fire-and-forget enqueue the RPC job (daemon picks it up)
 *
 * The error path matters as much as the happy path: if anything fails
 * AFTER the pending assistant row is created (most commonly
 * `assertRpcConnection` throwing because no admin-approved RPC session
 * exists), we MUST finalize the row as errored. Otherwise the client's
 * polling sees a forever-pending message and the UI is stuck on
 * "Working on it…" with no way to recover.
 */

import { ObjectId } from 'mongodb';
import { agentConversations } from '@/server/database';
import { createRpcJob } from '@/server/template/rpc/collection';
import {
    startTrace,
    appendTrace,
    finishTrace,
} from '@/server/database/collections/template/agentTraces/agentTraces';
import { toQueryId, toStringId } from '@/server/template/utils';
import type { ApiHandlerContext } from '@/apis/types';
import type { SendMessageRequest, SendMessageResponse } from '../types';

// No file extension — the daemon resolves `.ts`/`.js`/`/index.*`.
const HANDLER_PATH = 'src/server/project/demo-agent/handler';
const RPC_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_SYSTEM_PROMPT =
    'You are a helpful assistant. You have two tools available: get_time (returns the current server time, optionally in a given timezone) and calculate (one arithmetic operation on two numbers). Use them when relevant. Be concise.';

export const sendMessage = async (
    request: SendMessageRequest,
    context: ApiHandlerContext
): Promise<SendMessageResponse> => {
    if (!context.userId) return { error: 'Not authenticated' };
    if (!request.conversationId) return { error: 'conversationId is required' };
    if (!request.modelId) return { error: 'modelId is required' };
    if (!request.text || !request.text.trim()) {
        return { error: 'text is required' };
    }
    // Capture as non-nullable string so TypeScript narrows it inside
    // the failPending closure below (TS can't carry the guard across
    // the lambda boundary).
    const userIdStr: string = context.userId;

    let userId: ObjectId;
    let conversationId: ObjectId;
    try {
        userId = toQueryId(userIdStr) as ObjectId;
        conversationId = toQueryId(request.conversationId) as ObjectId;
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : 'Invalid id',
        };
    }

    const conversation = await agentConversations.findConversationById(
        conversationId,
        userId
    );
    if (!conversation) return { error: 'Conversation not found' };

    // Build history BEFORE writing the new user message.
    const priorMessages =
        await agentConversations.findMessagesByConversationId(
            conversationId,
            userId
        );
    const history = priorMessages
        .filter((m) => m.status === 'completed' && m.content.length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

    const userMessage = await agentConversations.createUserMessage({
        conversationId,
        userId,
        content: request.text.trim(),
    });

    const assistantMessage =
        await agentConversations.createPendingAssistantMessage({
            conversationId,
            userId,
        });

    // From here on, ANY error must finalize the pending assistant row
    // so the client doesn't see a forever-pending bubble.
    const adapter = agentConversations.makeAgentConversationsAdapter(
        userIdStr
    );
    const failPending = async (
        userVisibleMessage: string,
        traceMessage: string,
        traceData: Record<string, unknown>
    ): Promise<SendMessageResponse> => {
        try {
            await appendTrace(
                assistantMessage._id,
                { userId: userIdStr, conversationId },
                {
                    layer: 'vercel',
                    level: 'error',
                    message: traceMessage,
                    data: traceData,
                }
            );
            await adapter.finalizeAssistantMessage({
                id: assistantMessage._id,
                content: userVisibleMessage,
                cost: 0,
                events: [],
            });
            await finishTrace(assistantMessage._id, 'errored');
        } catch (innerErr) {
            // Don't let cleanup errors mask the original cause.
            console.error('sendMessage cleanup failed:', innerErr);
        }
        const erroredDoc = {
            ...assistantMessage,
            content: userVisibleMessage,
            status: 'errored' as const,
            cost: 0,
            finalizedAt: new Date(),
        };
        return {
            userMessage: agentConversations.toMessageClient(userMessage),
            assistantMessage: agentConversations.toMessageClient(erroredDoc),
            error: userVisibleMessage,
        };
    };

    try {
        const titleUpdate =
            priorMessages.length === 0
                ? { title: request.text.trim().slice(0, 80) }
                : {};
        await agentConversations.touchConversation(conversationId, {
            modelId: request.modelId,
            ...titleUpdate,
        });

        await startTrace({
            id: assistantMessage._id,
            userId: userIdStr,
            conversationId,
        });
        await appendTrace(
            assistantMessage._id,
            { userId: userIdStr, conversationId },
            {
                layer: 'vercel',
                level: 'info',
                message: 'send.received',
                data: {
                    modelId: request.modelId,
                    textLength: request.text.length,
                    historyLength: history.length,
                    resumeSessionId: conversation.sessionId ?? null,
                },
            }
        );

        await createRpcJob({
            handlerPath: HANDLER_PATH,
            args: {
                userId: userIdStr,
                conversationId: toStringId(conversationId),
                sourceMessageId: toStringId(assistantMessage._id),
                modelId: request.modelId,
                systemPrompt: request.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
                userText: request.text.trim(),
                history,
                resumeSessionId: conversation.sessionId,
            },
            secret: process.env.RPC_SECRET ?? '',
            status: 'pending',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + RPC_TTL_MS),
        });

        await appendTrace(
            assistantMessage._id,
            { userId: userIdStr, conversationId },
            { layer: 'vercel', level: 'info', message: 'rpc.enqueued' }
        );

        return {
            userMessage: agentConversations.toMessageClient(userMessage),
            assistantMessage:
                agentConversations.toMessageClient(assistantMessage),
        };
    } catch (error) {
        const raw = error instanceof Error ? error.message : String(error);
        // Heuristic: the most common failure mode here is the RPC
        // connection gate rejecting an unapproved session. Surface a
        // clearer message than the raw error code.
        const looksLikeGateError = /RPC connection/i.test(raw);
        const userVisible = looksLikeGateError
            ? "The RPC daemon isn't connected. Approve an RPC session from the Connection page and try again."
            : `Couldn't reach the agent daemon: ${raw}`;
        console.error('sendMessage enqueue failed:', error);
        return failPending(userVisible, 'rpc.enqueue-failed', { error: raw });
    }
};
