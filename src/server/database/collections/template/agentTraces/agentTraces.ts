import { Collection, ObjectId } from 'mongodb';
import { getDb } from '../../../connection';
import { toStringId } from '@/server/template/utils';
import type {
    AgentTraceClient,
    AgentTraceDocument,
    TraceEntry,
} from './types';

const COLLECTION = 'agentTraces';
let indexesEnsured = false;

async function getCollection(): Promise<Collection<AgentTraceDocument>> {
    const db = await getDb();
    const col = db.collection<AgentTraceDocument>(COLLECTION);
    if (!indexesEnsured) {
        await col.createIndex({ userId: 1, conversationId: 1, startedAt: -1 });
        // 30-day TTL on startedAt — old traces aren't useful for debug.
        await col.createIndex(
            { startedAt: 1 },
            { expireAfterSeconds: 30 * 24 * 60 * 60 }
        );
        indexesEnsured = true;
    }
    return col;
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
 * Append one log entry to the trace. Atomic `$push`, no read-modify-
 * write race. Caller-side errors are SWALLOWED — observability must
 * never break the actual flow it's observing.
 */
export async function appendTrace(
    messageId: ObjectId,
    entry: Omit<TraceEntry, 'at'>
): Promise<void> {
    try {
        const col = await getCollection();
        const full: TraceEntry = { ...entry, at: new Date().toISOString() };
        await col.updateOne({ _id: messageId }, { $push: { entries: full } });
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
        await col.updateOne(
            { _id: messageId },
            { $set: { status, finishedAt: new Date() } }
        );
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
