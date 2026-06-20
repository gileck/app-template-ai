import { Collection, ObjectId } from 'mongodb';
import { getDb } from '../../../connection';
import { toStringId } from '@/server/template/utils';
import type {
    AgentTraceClient,
    AgentTraceDocument,
    TraceEntry,
} from './types';

const COLLECTION = 'agentTraces';
let collectionPromise: Promise<Collection<AgentTraceDocument>> | null = null;

function getCollection(): Promise<Collection<AgentTraceDocument>> {
    if (!collectionPromise) {
        collectionPromise = (async () => {
            const db = await getDb();
            const col = db.collection<AgentTraceDocument>(COLLECTION);
            await col.createIndex({ userId: 1, conversationId: 1, startedAt: -1 });
            // Cross-user admin queries: recent listing + stuck-at-started scan.
            await col.createIndex({ status: 1, startedAt: -1 });
            // 30-day TTL on startedAt — old traces aren't useful for debug.
            await col.createIndex(
                { startedAt: 1 },
                { expireAfterSeconds: 30 * 24 * 60 * 60 }
            );
            return col;
        })().catch((err) => {
            // Reset so the next caller retries instead of getting a
            // permanently-rejected cached promise.
            collectionPromise = null;
            throw err;
        });
    }
    return collectionPromise;
}

/**
 * Open a trace at the start of an assistant turn. `id` is the SAME
 * ObjectId used for the pending assistant message, so a trace exists
 * for every turn attempt — even if everything downstream crashes.
 */
export async function startTrace(input: {
    id: ObjectId;
    userId: string;
    conversationId: ObjectId;
}): Promise<void> {
    const col = await getCollection();
    const doc: AgentTraceDocument = {
        _id: input.id,
        userId: input.userId,
        conversationId: input.conversationId,
        status: 'started',
        startedAt: new Date(),
        entries: [],
    };
    await col.insertOne(doc);
}

/**
 * Trace identity needed to create the row if it doesn't exist yet.
 * Required because `appendTrace` upserts — callers that skipped
 * `startTrace` still get a valid trace doc on first append.
 */
export interface TraceContext {
    userId: string;
    conversationId: ObjectId;
}

/**
 * Append one log entry to the trace. Atomic `$push`, no read-modify-
 * write race. Upserts with `$setOnInsert` so calling `startTrace`
 * upstream is OPTIONAL — projects that call it (e.g. Vercel-side
 * `sendMessage.ts`) get pre-daemon events captured under a row that
 * already exists; projects that don't still get daemon-side events
 * because the first append creates the row. Caller-side errors are
 * SWALLOWED — observability must never break the flow it's observing.
 */
export async function appendTrace(
    messageId: ObjectId,
    ctx: TraceContext,
    entry: Omit<TraceEntry, 'at'>
): Promise<void> {
    try {
        const col = await getCollection();
        const full: TraceEntry = { ...entry, at: new Date().toISOString() };
        await col.updateOne(
            { _id: messageId },
            {
                $push: { entries: full },
                $setOnInsert: {
                    userId: ctx.userId,
                    conversationId: ctx.conversationId,
                    status: 'started',
                    startedAt: new Date(),
                },
            },
            { upsert: true }
        );
    } catch (err) {
        // Last-resort console log — at least leaves a daemon-stdout
        // crumb that something tried to log and failed.
        console.error('[agent-trace] appendTrace failed', err);
    }
}

/** Close the trace — flip status + stamp finishedAt. Idempotent;
 *  multiple finishers (Vercel + daemon) on the same trace last-write-
 *  wins, which is fine since the latest writer has the truest state. */
export async function finishTrace(
    messageId: ObjectId,
    status: 'completed' | 'errored'
): Promise<void> {
    try {
        const col = await getCollection();
        const result = await col.updateOne(
            { _id: messageId },
            { $set: { status, finishedAt: new Date() } }
        );
        if (result.matchedCount === 0) {
            // Every code path runs at least one appendTrace (which
            // upserts) before finishTrace, so a missing row here means
            // something dropped the doc between then and now — TTL,
            // manual delete, or a bug.
            console.error(
                '[agent-trace] finishTrace matched no document',
                { messageId: messageId.toString(), status }
            );
        }
    } catch (err) {
        console.error('[agent-trace] finishTrace failed', err);
    }
}

export function toAgentTraceClient(doc: AgentTraceDocument): AgentTraceClient {
    return {
        id: toStringId(doc._id),
        conversationId: toStringId(doc.conversationId),
        status: doc.status,
        startedAt: doc.startedAt.toISOString(),
        finishedAt: doc.finishedAt ? doc.finishedAt.toISOString() : null,
        entries: doc.entries,
    };
}

/** All traces for a conversation, scoped to the user, newest first. */
export async function findTracesByConversation(
    userId: string,
    conversationId: ObjectId,
    limit = 50
): Promise<AgentTraceDocument[]> {
    const col = await getCollection();
    return col
        .find({ userId, conversationId })
        .sort({ startedAt: -1 })
        .limit(limit)
        .toArray();
}

/** A single trace by its message id, scoped to the user. */
export async function findTraceByMessageId(
    userId: string,
    messageId: ObjectId
): Promise<AgentTraceDocument | null> {
    const col = await getCollection();
    return col.findOne({ _id: messageId, userId });
}

// ─── admin (cross-user) ──────────────────────────────────────────────────
//
// These finders drop the userId scope to power the admin trace explorer.
// `agentTraces` has a 30-day TTL, so they only ever see recent rows.

export interface TraceListFilter {
    status?: AgentTraceDocument['status'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
}

/** Recent traces across all users, newest first. */
export async function findRecentTracesAnyUser(
    filter: TraceListFilter = {}
): Promise<AgentTraceDocument[]> {
    const col = await getCollection();
    const query: Record<string, unknown> = {};
    if (filter.status) query.status = filter.status;
    if (filter.startDate || filter.endDate) {
        const startedAt: Record<string, Date> = {};
        if (filter.startDate) startedAt.$gte = filter.startDate;
        if (filter.endDate) startedAt.$lte = filter.endDate;
        query.startedAt = startedAt;
    }
    return col
        .find(query)
        .sort({ startedAt: -1 })
        .limit(Math.min(filter.limit ?? 100, 500))
        .toArray();
}

/** Traces stuck at status='started' older than `thresholdMs` — the
 *  silent-crash signal. Oldest first (most-stuck at the top). */
export async function findStuckTracesAnyUser(
    thresholdMs: number,
    limit = 100
): Promise<AgentTraceDocument[]> {
    const col = await getCollection();
    const cutoff = new Date(Date.now() - thresholdMs);
    return col
        .find({ status: 'started', startedAt: { $lt: cutoff } })
        .sort({ startedAt: 1 })
        .limit(Math.min(limit, 500))
        .toArray();
}

/** A single trace by message id, any user (admin detail view). */
export async function findTraceByMessageIdAnyUser(
    messageId: ObjectId
): Promise<AgentTraceDocument | null> {
    const col = await getCollection();
    return col.findOne({ _id: messageId });
}

/** Count of traces by lifecycle status in an optional window. */
export async function getTraceStatusCounts(filter: {
    startDate?: Date;
    endDate?: Date;
} = {}): Promise<{ started: number; completed: number; errored: number }> {
    const col = await getCollection();
    const match: Record<string, unknown> = {};
    if (filter.startDate || filter.endDate) {
        const startedAt: Record<string, Date> = {};
        if (filter.startDate) startedAt.$gte = filter.startDate;
        if (filter.endDate) startedAt.$lte = filter.endDate;
        match.startedAt = startedAt;
    }
    const rows = await col
        .aggregate<{ _id: AgentTraceDocument['status']; count: number }>([
            { $match: match },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .toArray();
    const out = { started: 0, completed: 0, errored: 0 };
    for (const r of rows) {
        if (r._id in out) out[r._id] = r.count;
    }
    return out;
}

/** Average turn latency (ms) over finished traces in the window. */
export async function getTraceLatencyStats(filter: {
    startDate?: Date;
    endDate?: Date;
} = {}): Promise<{ avgMs: number; count: number }> {
    const col = await getCollection();
    const match: Record<string, unknown> = { finishedAt: { $exists: true } };
    if (filter.startDate || filter.endDate) {
        const startedAt: Record<string, Date> = {};
        if (filter.startDate) startedAt.$gte = filter.startDate;
        if (filter.endDate) startedAt.$lte = filter.endDate;
        match.startedAt = startedAt;
    }
    const rows = await col
        .aggregate<{ avgMs: number; count: number }>([
            { $match: match },
            {
                $group: {
                    _id: null,
                    // Clamp each duration to >= 0: startedAt (Vercel) and
                    // finishedAt (daemon, separate machine) come from
                    // different wall-clocks, so skew can yield a negative
                    // delta that would drag the average down.
                    avgMs: {
                        $avg: {
                            $max: [{ $subtract: ['$finishedAt', '$startedAt'] }, 0],
                        },
                    },
                    count: { $sum: 1 },
                },
            },
        ])
        .toArray();
    return { avgMs: Math.round(rows[0]?.avgMs ?? 0), count: rows[0]?.count ?? 0 };
}
