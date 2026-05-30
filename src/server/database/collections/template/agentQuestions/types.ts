import type { ObjectId } from 'mongodb';

/**
 * A batch of multiple-choice questions the agent asked the user
 * mid-turn (mirrors the shape of the native AskUserQuestion tool: one
 * or more questions, each single- or multi-select).
 *
 * Lifecycle: the `ask_user` tool creates one ('pending') and then
 * BLOCKS the agent turn polling this row until it flips to 'answered'
 * (user submitted the whole batch), 'cancelled' (user dismissed /
 * message cancelled), or 'expired' (the tool's wait timed out). Because
 * the tool blocks on the daemon (a long-lived process), this is the
 * whole human-in-the-loop mechanism — no session resume gymnastics.
 */
export type AgentQuestionStatus =
    | 'pending'
    | 'answered'
    | 'cancelled'
    | 'expired';

/** One selectable choice. `label` is both the display text and the
 *  identity returned when chosen; `description` is optional sub-text. */
export interface AgentQuestionOption {
    label: string;
    description?: string;
}

/** One question within the batch. */
export interface AgentSubQuestion {
    question: string;
    /** Optional short chip/title (1–3 words). */
    header?: string;
    /** The choices (already de-duplicated by label). */
    options: AgentQuestionOption[];
    /** When true, the user may pick more than one option for THIS
     *  question. */
    multiSelect: boolean;
    /** Min/max options the user must/may select for THIS question. */
    minSelections: number;
    maxSelections: number;
}

export interface AgentQuestionDocument {
    _id: ObjectId;
    userId: ObjectId;
    conversationId: ObjectId;
    /** The assistant message this batch belongs to — same id as the
     *  pending assistant row / `sourceMessageId` the tool runs under. */
    messageId: ObjectId;
    /** One or more questions, asked together. */
    questions: AgentSubQuestion[];
    status: AgentQuestionStatus;
    /** Per sub-question, the option LABELS the user selected. Index-
     *  aligned to `questions`. All empty until answered. */
    answers: string[][];
    createdAt: Date;
    answeredAt?: Date;
}

// ─── wire shape (client-facing) ──────────────────────────────────────────

export interface AgentQuestionClient {
    id: string;
    conversationId: string;
    messageId: string;
    questions: AgentSubQuestion[];
    status: AgentQuestionStatus;
    answers: string[][];
    createdAt: string;
    answeredAt: string | null;
}
