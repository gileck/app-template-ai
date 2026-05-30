import { Collection, ObjectId } from 'mongodb';
import { getDb } from '../../../connection';
import { toStringId } from '@/server/template/utils';
import type {
    AgentQuestionClient,
    AgentQuestionDocument,
    AgentSubQuestion,
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
    /** The normalized question batch (defaults already applied). */
    questions: AgentSubQuestion[];
}

/** Insert a pending question batch. Returns the new row's id. */
export async function createQuestion(
    input: CreateQuestionInput
): Promise<ObjectId> {
    const col = await getCollection();
    const doc: AgentQuestionDocument = {
        _id: new ObjectId(),
        userId: input.userId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        questions: input.questions,
        status: 'pending',
        answers: input.questions.map(() => []),
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
 * Validate a single sub-question's selection against its options +
 * min/max bounds. Returns the normalized selection (known labels, in
 * the question's option order) or an error string.
 */
function validateSelection(
    sub: AgentSubQuestion,
    index: number,
    selected: string[]
): { ok: true; selected: string[] } | { ok: false; error: string } {
    const allowed = new Set(sub.options.map((o) => o.label));
    const unknown = selected.filter((s) => !allowed.has(s));
    if (unknown.length > 0) {
        return {
            ok: false,
            error: `Question ${index + 1}: unknown option(s): ${unknown.join(', ')}`,
        };
    }
    // De-dupe + preserve option order.
    const normalized = sub.options
        .map((o) => o.label)
        .filter((label) => selected.includes(label));
    if (normalized.length < sub.minSelections) {
        return {
            ok: false,
            error: `Question ${index + 1}: select at least ${sub.minSelections} option(s).`,
        };
    }
    if (normalized.length > sub.maxSelections) {
        return {
            ok: false,
            error: `Question ${index + 1}: select at most ${sub.maxSelections} option(s).`,
        };
    }
    return { ok: true, selected: normalized };
}

/**
 * Record the user's answers to the whole batch. Validates each sub-
 * question against its options + bounds, and only succeeds while the
 * row is still 'pending' (so a late answer after timeout/cancel can't
 * revive a dead question). Atomic: the find-and-update is guarded on
 * status.
 */
export async function answerQuestion(input: {
    id: ObjectId;
    userId: ObjectId;
    /** Per sub-question selected labels, index-aligned to `questions`. */
    answers: string[][];
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
    if (input.answers.length !== question.questions.length) {
        return {
            ok: false,
            error: `Expected answers for ${question.questions.length} question(s), got ${input.answers.length}.`,
        };
    }

    const normalizedAnswers: string[][] = [];
    for (let i = 0; i < question.questions.length; i++) {
        const result = validateSelection(
            question.questions[i],
            i,
            input.answers[i] ?? []
        );
        if (!result.ok) return result;
        normalizedAnswers.push(result.selected);
    }

    const answeredAt = new Date();
    const updated = await col.findOneAndUpdate(
        { _id: input.id, userId: input.userId, status: 'pending' },
        { $set: { status: 'answered', answers: normalizedAnswers, answeredAt } },
        { returnDocument: 'after' }
    );
    if (!updated) {
        // Lost a race — something else flipped it out of 'pending'.
        return {
            ok: false,
            error: 'This question is no longer awaiting an answer.',
        };
    }
    return { ok: true, question: updated };
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
        questions: doc.questions,
        status: doc.status,
        answers: doc.answers,
        createdAt: doc.createdAt.toISOString(),
        answeredAt: doc.answeredAt ? doc.answeredAt.toISOString() : null,
    };
}
