import { Collection, ObjectId } from 'mongodb';
import { getDb } from '../../../connection';
import { toStringId } from '@/server/template/utils';
import type {
    AgentQuestionClient,
    AgentQuestionDocument,
} from './types';

const COLLECTION = 'agentQuestions';
let collectionPromise: Promise<Collection<AgentQuestionDocument>> | null = null;

function getCollection(): Promise<Collection<AgentQuestionDocument>> {
    if (!collectionPromise) {
        collectionPromise = (async () => {
            const db = await getDb();
            const col = db.collection<AgentQuestionDocument>(COLLECTION);
            await col.createIndex({ conversationId: 1, createdAt: 1 });
            await col.createIndex({ messageId: 1 });
            // 1-day TTL — a question is only useful while the turn that
            // asked it is alive. Stragglers self-clean.
            await col.createIndex(
                { createdAt: 1 },
                { expireAfterSeconds: 24 * 60 * 60 }
            );
            return col;
        })().catch((err) => {
            collectionPromise = null;
            throw err;
        });
    }
    return collectionPromise;
}

export interface CreateQuestionInput {
    userId: ObjectId;
    conversationId: ObjectId;
    messageId: ObjectId;
    question: string;
    options: string[];
    allowMultiple: boolean;
    minSelections: number;
    maxSelections: number;
}

/** Insert a pending question. Returns the new question's id. */
export async function createQuestion(
    input: CreateQuestionInput
): Promise<ObjectId> {
    const col = await getCollection();
    const doc: AgentQuestionDocument = {
        _id: new ObjectId(),
        userId: input.userId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        question: input.question,
        options: input.options,
        allowMultiple: input.allowMultiple,
        minSelections: input.minSelections,
        maxSelections: input.maxSelections,
        status: 'pending',
        selected: [],
        createdAt: new Date(),
    };
    await col.insertOne(doc);
    return doc._id;
}

export async function findQuestionById(
    id: ObjectId
): Promise<AgentQuestionDocument | null> {
    const col = await getCollection();
    return col.findOne({ _id: id });
}

export async function findQuestionsByConversationId(
    conversationId: ObjectId,
    userId: ObjectId
): Promise<AgentQuestionDocument[]> {
    const col = await getCollection();
    return col
        .find({ conversationId, userId })
        .sort({ createdAt: 1 })
        .toArray();
}

export type AnswerQuestionResult =
    | { ok: true; question: AgentQuestionDocument }
    | { ok: false; error: string };

/**
 * Record the user's selection. Validates the choice against the stored
 * options + min/max bounds, and only succeeds while the question is
 * still 'pending' (so a late answer after timeout/cancel can't revive
 * a dead question). Atomic: the find-and-update is guarded on status.
 */
export async function answerQuestion(input: {
    id: ObjectId;
    userId: ObjectId;
    selected: string[];
}): Promise<AnswerQuestionResult> {
    const col = await getCollection();
    const question = await col.findOne({ _id: input.id, userId: input.userId });
    if (!question) return { ok: false, error: 'Question not found.' };
    if (question.status !== 'pending') {
        return {
            ok: false,
            error: 'This question is no longer awaiting an answer.',
        };
    }

    // Normalize: de-dupe, keep only known options, preserve option order.
    const allowed = new Set(question.options);
    const selected = question.options.filter(
        (opt) => input.selected.includes(opt)
    );
    const unknown = input.selected.filter((s) => !allowed.has(s));
    if (unknown.length > 0) {
        return {
            ok: false,
            error: `Unknown option(s): ${unknown.join(', ')}`,
        };
    }
    if (selected.length < question.minSelections) {
        return {
            ok: false,
            error: `Select at least ${question.minSelections} option(s).`,
        };
    }
    if (selected.length > question.maxSelections) {
        return {
            ok: false,
            error: `Select at most ${question.maxSelections} option(s).`,
        };
    }

    const answeredAt = new Date();
    const result = await col.findOneAndUpdate(
        { _id: input.id, userId: input.userId, status: 'pending' },
        { $set: { status: 'answered', selected, answeredAt } },
        { returnDocument: 'after' }
    );
    if (!result) {
        // Lost a race — something else flipped it out of 'pending'.
        return {
            ok: false,
            error: 'This question is no longer awaiting an answer.',
        };
    }
    return { ok: true, question: result };
}

/**
 * Mark every still-pending question on a message as cancelled. Called
 * when the user cancels the assistant turn so the blocked `ask_user`
 * tool stops waiting and returns control to the agent.
 */
export async function cancelQuestionsForMessage(
    messageId: ObjectId
): Promise<void> {
    const col = await getCollection();
    await col.updateMany(
        { messageId, status: 'pending' },
        { $set: { status: 'cancelled' } }
    );
}

/** Flip a still-pending question to 'expired' (tool wait timed out). */
export async function expireQuestion(id: ObjectId): Promise<void> {
    const col = await getCollection();
    await col.updateOne(
        { _id: id, status: 'pending' },
        { $set: { status: 'expired' } }
    );
}

export function toQuestionClient(
    doc: AgentQuestionDocument
): AgentQuestionClient {
    return {
        id: toStringId(doc._id),
        conversationId: toStringId(doc.conversationId),
        messageId: toStringId(doc.messageId),
        question: doc.question,
        options: doc.options,
        allowMultiple: doc.allowMultiple,
        minSelections: doc.minSelections,
        maxSelections: doc.maxSelections,
        status: doc.status,
        selected: doc.selected,
        createdAt: doc.createdAt.toISOString(),
        answeredAt: doc.answeredAt ? doc.answeredAt.toISOString() : null,
    };
}
