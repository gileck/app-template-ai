import { Collection, ObjectId } from 'mongodb';
import { getDb } from '../../../connection';
import { toStringId } from '@/server/template/utils';
import type {
    AgentConversationsCollection,
    AgentEvent,
    FinalizeAssistantInput,
} from '@/server/template/agentic';
import {
    setConversationSessionId as setConversationSessionIdRow,
    touchConversation,
} from './conversations';
import type {
    AgentDateRange,
    AgentMessageAttachment,
    AgentMessageClient,
    AgentMessageDocument,
    AgentMessageRole,
    AssistantTurnStats,
    DailyAgentCostRow,
    ModelUsageRow,
    ToolUsageRow,
    UserSpendRow,
} from './types';

const COLLECTION = 'agentMessages';
let collectionPromise: Promise<Collection<AgentMessageDocument>> | null = null;

function getCollection(): Promise<Collection<AgentMessageDocument>> {
    if (!collectionPromise) {
        collectionPromise = (async () => {
            const db = await getDb();
            const col = db.collection<AgentMessageDocument>(COLLECTION);
            await col.createIndex({ conversationId: 1, createdAt: 1 });
            return col;
        })().catch((err) => {
            collectionPromise = null;
            throw err;
        });
    }
    return collectionPromise;
}

export async function createUserMessage(input: {
    conversationId: ObjectId;
    userId: ObjectId;
    content: string;
    attachments?: AgentMessageAttachment[];
}): Promise<AgentMessageDocument> {
    const col = await getCollection();
    const doc: AgentMessageDocument = {
        _id: new ObjectId(),
        conversationId: input.conversationId,
        userId: input.userId,
        role: 'user',
        content: input.content,
        events: [],
        cost: 0,
        status: 'completed',
        createdAt: new Date(),
        finalizedAt: new Date(),
        ...(input.attachments && input.attachments.length > 0
            ? { attachments: input.attachments }
            : {}),
    };
    await col.insertOne(doc);
    return doc;
}

/**
 * Create a pending assistant message stub. Returned ObjectId is shared
 * with the agent trace row and used as `sourceMessageId` in the RPC
 * args — the daemon's handler will append events and finalize it.
 */
export async function createPendingAssistantMessage(input: {
    conversationId: ObjectId;
    userId: ObjectId;
}): Promise<AgentMessageDocument> {
    const col = await getCollection();
    const doc: AgentMessageDocument = {
        _id: new ObjectId(),
        conversationId: input.conversationId,
        userId: input.userId,
        role: 'assistant',
        content: '',
        events: [],
        cost: 0,
        status: 'pending',
        createdAt: new Date(),
    };
    await col.insertOne(doc);
    return doc;
}

export async function findMessagesByConversationId(
    conversationId: ObjectId,
    userId: ObjectId
): Promise<AgentMessageDocument[]> {
    const col = await getCollection();
    return col
        .find({ conversationId, userId })
        .sort({ createdAt: 1 })
        .toArray();
}

export async function deleteMessagesByConversationId(
    conversationId: ObjectId,
    userId: ObjectId
): Promise<void> {
    const col = await getCollection();
    await col.deleteMany({ conversationId, userId });
}

export async function findMessageById(
    messageId: ObjectId,
    userId: ObjectId
): Promise<AgentMessageDocument | null> {
    const col = await getCollection();
    return col.findOne({ _id: messageId, userId });
}

/**
 * Cancel a pending assistant message. Atomic: only flips the row if
 * it's still pending, so it can't race with a daemon finalize landing
 * at the same moment. Returns true if we actually cancelled.
 */
export async function cancelPendingMessage(
    messageId: ObjectId,
    userId: ObjectId,
    reason = 'Cancelled by user.'
): Promise<boolean> {
    const col = await getCollection();
    const result = await col.updateOne(
        { _id: messageId, userId, status: 'pending' },
        {
            $set: {
                status: 'errored',
                content: reason,
                cost: 0,
                finalizedAt: new Date(),
            },
        }
    );
    return result.matchedCount > 0;
}

export function toMessageClient(doc: AgentMessageDocument): AgentMessageClient {
    return {
        id: toStringId(doc._id),
        conversationId: toStringId(doc.conversationId),
        role: doc.role as AgentMessageRole,
        content: doc.content,
        events: doc.events,
        cost: doc.cost,
        tokens: doc.tokens ?? null,
        attachments: doc.attachments ?? [],
        status: doc.status,
        createdAt: doc.createdAt.toISOString(),
        finalizedAt: doc.finalizedAt ? doc.finalizedAt.toISOString() : null,
    };
}

// ─── admin analytics (cross-user aggregations) ───────────────────────────
//
// These finders intentionally DROP the userId filter — they power the
// admin-only agent dashboards and must see every user's turns. All are
// read-only aggregations over `agentMessages` (assistant rows only).

/** Build a `createdAt` match fragment from an optional date window. */
function rangeMatch(range?: AgentDateRange): Record<string, unknown> {
    if (!range || (!range.startDate && !range.endDate)) return {};
    const createdAt: Record<string, Date> = {};
    if (range.startDate) createdAt.$gte = range.startDate;
    if (range.endDate) createdAt.$lte = range.endDate;
    return { createdAt };
}

/** Totals across every assistant turn in the window. */
export async function getAssistantTurnStats(
    range?: AgentDateRange
): Promise<AssistantTurnStats> {
    const col = await getCollection();
    const rows = await col
        .aggregate<{
            total: number;
            completed: number;
            errored: number;
            pending: number;
            totalCost: number;
            totalInputTokens: number;
            totalOutputTokens: number;
        }>([
            { $match: { role: 'assistant', ...rangeMatch(range) } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                    },
                    errored: {
                        $sum: { $cond: [{ $eq: ['$status', 'errored'] }, 1, 0] },
                    },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
                    },
                    totalCost: { $sum: '$cost' },
                    totalInputTokens: { $sum: { $ifNull: ['$tokens.input', 0] } },
                    totalOutputTokens: { $sum: { $ifNull: ['$tokens.output', 0] } },
                },
            },
        ])
        .toArray();
    const r = rows[0];
    return {
        total: r?.total ?? 0,
        completed: r?.completed ?? 0,
        errored: r?.errored ?? 0,
        pending: r?.pending ?? 0,
        totalCost: r?.totalCost ?? 0,
        totalInputTokens: r?.totalInputTokens ?? 0,
        totalOutputTokens: r?.totalOutputTokens ?? 0,
    };
}

/** Cost + token usage grouped by the conversation's model. */
export async function getCostByModel(
    range?: AgentDateRange
): Promise<ModelUsageRow[]> {
    const col = await getCollection();
    const rows = await col
        .aggregate<{
            _id: string | null;
            turns: number;
            cost: number;
            inputTokens: number;
            outputTokens: number;
        }>([
            { $match: { role: 'assistant', ...rangeMatch(range) } },
            {
                $lookup: {
                    from: 'agentConversations',
                    localField: 'conversationId',
                    foreignField: '_id',
                    as: 'conversation',
                },
            },
            {
                $group: {
                    _id: { $arrayElemAt: ['$conversation.modelId', 0] },
                    turns: { $sum: 1 },
                    cost: { $sum: '$cost' },
                    inputTokens: { $sum: { $ifNull: ['$tokens.input', 0] } },
                    outputTokens: { $sum: { $ifNull: ['$tokens.output', 0] } },
                },
            },
            { $sort: { cost: -1 } },
        ])
        .toArray();
    return rows.map((r) => ({
        modelId: r._id ?? 'unknown',
        turns: r.turns,
        cost: r.cost,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
    }));
}

/** Assistant cost + turn count per UTC day, oldest first. */
export async function getDailyAgentCost(
    range?: AgentDateRange
): Promise<DailyAgentCostRow[]> {
    const col = await getCollection();
    const rows = await col
        .aggregate<{ _id: string; cost: number; turns: number }>([
            { $match: { role: 'assistant', ...rangeMatch(range) } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                    },
                    cost: { $sum: '$cost' },
                    turns: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ])
        .toArray();
    return rows.map((r) => ({ date: r._id, cost: r.cost, turns: r.turns }));
}

/** Top spenders by assistant cost, highest first. */
export async function getTopSpenders(
    range?: AgentDateRange,
    limit = 10
): Promise<UserSpendRow[]> {
    const col = await getCollection();
    const rows = await col
        .aggregate<{ _id: ObjectId; cost: number; turns: number }>([
            { $match: { role: 'assistant', ...rangeMatch(range) } },
            {
                $group: {
                    _id: '$userId',
                    cost: { $sum: '$cost' },
                    turns: { $sum: 1 },
                },
            },
            { $sort: { cost: -1 } },
            { $limit: limit },
        ])
        .toArray();
    return rows.map((r) => ({
        userId: toStringId(r._id),
        cost: r.cost,
        turns: r.turns,
    }));
}

/** Per-tool reliability counters, unwinding every turn's `events`. */
export async function getToolUsageStats(
    range?: AgentDateRange
): Promise<ToolUsageRow[]> {
    const col = await getCollection();
    const rows = await col
        .aggregate<{
            _id: string;
            calls: number;
            results: number;
            ok: number;
            wrote: number;
            truncated: number;
        }>([
            { $match: { role: 'assistant', ...rangeMatch(range) } },
            { $unwind: '$events' },
            {
                $match: {
                    'events.type': { $in: ['tool_call', 'tool_result'] },
                },
            },
            {
                $group: {
                    _id: '$events.name',
                    calls: {
                        $sum: {
                            $cond: [{ $eq: ['$events.type', 'tool_call'] }, 1, 0],
                        },
                    },
                    results: {
                        $sum: {
                            $cond: [{ $eq: ['$events.type', 'tool_result'] }, 1, 0],
                        },
                    },
                    ok: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$events.type', 'tool_result'] },
                                        { $eq: ['$events.ok', true] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                    wrote: {
                        $sum: { $cond: [{ $eq: ['$events.wrote', true] }, 1, 0] },
                    },
                    truncated: {
                        $sum: { $cond: [{ $eq: ['$events.truncated', true] }, 1, 0] },
                    },
                },
            },
            { $sort: { calls: -1 } },
        ])
        .toArray();
    return rows.map((r) => ({
        name: r._id ?? 'unknown',
        calls: r.calls,
        results: r.results,
        ok: r.ok,
        failed: Math.max(0, r.results - r.ok),
        wrote: r.wrote,
        truncated: r.truncated,
        incomplete: Math.max(0, r.calls - r.results),
    }));
}

/** Total assistant cost for a single user (powers the user-360 view). */
export async function getUserAgentSpend(
    userId: ObjectId
): Promise<{ cost: number; turns: number }> {
    const col = await getCollection();
    const rows = await col
        .aggregate<{ cost: number; turns: number }>([
            { $match: { role: 'assistant', userId } },
            {
                $group: {
                    _id: null,
                    cost: { $sum: '$cost' },
                    turns: { $sum: 1 },
                },
            },
        ])
        .toArray();
    return { cost: rows[0]?.cost ?? 0, turns: rows[0]?.turns ?? 0 };
}

// ─── AgentConversationsCollection adapter ────────────────────────────────

/**
 * Factory that satisfies `AgentConversationsCollection` from the
 * agentic template. The daemon's handler calls these three methods
 * during a turn — we never expose them directly to API handlers.
 *
 * `userId` is captured for two reasons: (1) so we can stamp it on
 * future writes if needed, and (2) so the contract matches the
 * template's `conversations: (userId) => …` factory shape.
 */
export function makeAgentConversationsAdapter(
    _userId: string
): AgentConversationsCollection {
    return {
        async appendAgentEvent(
            messageId: ObjectId,
            event: AgentEvent
        ): Promise<void> {
            const col = await getCollection();
            await col.updateOne(
                { _id: messageId },
                { $push: { events: event } }
            );
        },

        async finalizeAssistantMessage(
            input: FinalizeAssistantInput
        ): Promise<void> {
            const col = await getCollection();
            // Filter on status:'pending' so a late-arriving daemon
            // finalize doesn't overwrite a user cancellation (or any
            // other terminal state set elsewhere). If the row isn't
            // pending anymore, this is a no-op.
            const existing = await col.findOne({ _id: input.id });
            const $set: Record<string, unknown> = {
                content: input.content,
                cost: input.cost,
                events: input.events,
                // The handler's error paths always pass `events: []`
                // (and a "Sorry —" content string); success paths
                // always have at least one event.
                status: input.events.length === 0 ? 'errored' : 'completed',
                finalizedAt: new Date(),
            };
            if (input.tokens) {
                $set.tokens = input.tokens;
            }
            const result = await col.updateOne(
                { _id: input.id, status: 'pending' },
                { $set }
            );
            if (result.matchedCount > 0 && existing) {
                await touchConversation(existing.conversationId);
            }
        },

        async setConversationSessionId(
            conversationId: ObjectId,
            sessionId: string
        ): Promise<void> {
            await setConversationSessionIdRow(conversationId, sessionId);
        },
    };
}
