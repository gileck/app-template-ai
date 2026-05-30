import type { ObjectId } from 'mongodb';

/**
 * A multiple-choice question the agent asked the user mid-turn.
 *
 * Lifecycle: the `ask_user` tool creates one ('pending') and then
 * BLOCKS the agent turn polling this row until it flips to 'answered'
 * (user submitted), 'cancelled' (user dismissed / message cancelled),
 * or 'expired' (the tool's wait timed out). Because the tool blocks on
 * the daemon (a long-lived process), this is the whole human-in-the-
 * loop mechanism — no session resume gymnastics required.
 */
export type AgentQuestionStatus =
    | 'pending'
    | 'answered'
    | 'cancelled'
    | 'expired';

export interface AgentQuestionDocument {
    _id: ObjectId;
    userId: ObjectId;
    conversationId: ObjectId;
    /** The assistant message this question belongs to — same id as the
     *  pending assistant row / `sourceMessageId` the tool runs under. */
    messageId: ObjectId;
    question: string;
    /** The choices shown to the user (already de-duplicated). */
    options: string[];
    /** When true, the user may pick more than one option. */
    allowMultiple: boolean;
    /** Minimum number of options the user must select to submit. */
    minSelections: number;
    /** Maximum number of options the user may select. */
    maxSelections: number;
    status: AgentQuestionStatus;
    /** The exact option strings the user selected. Empty until answered. */
    selected: string[];
    createdAt: Date;
    answeredAt?: Date;
}

// ─── wire shape (client-facing) ──────────────────────────────────────────

export interface AgentQuestionClient {
    id: string;
    conversationId: string;
    messageId: string;
    question: string;
    options: string[];
    allowMultiple: boolean;
    minSelections: number;
    maxSelections: number;
    status: AgentQuestionStatus;
    selected: string[];
    createdAt: string;
    answeredAt: string | null;
}
