import type { ObjectId } from 'mongodb';
import type { AgentEvent } from '@/server/template/agentic';

/**
 * One agent conversation = a thread. Messages live in a sibling
 * collection (agentMessages) keyed by conversationId so appendAgentEvent
 * doesn't have to read-modify-write a growing embedded array.
 */
export interface AgentConversationDocument {
    _id: ObjectId;
    userId: ObjectId;
    title: string;
    /** Last model the user picked for this conversation. Persisted so
     *  the picker remembers per-thread. */
    modelId: string;
    /** Provider-side session id from the most recent assistant turn —
     *  passed back as `resumeSessionId` on the next turn so the adapter
     *  can skip re-serialising history. Cleared when the user resets. */
    sessionId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export type AgentMessageRole = 'user' | 'assistant';

export type AgentMessageStatus = 'pending' | 'completed' | 'errored';

export interface AgentMessageTokens {
    input: number;
    output: number;
}

export interface AgentMessageDocument {
    _id: ObjectId;
    conversationId: ObjectId;
    userId: ObjectId;
    role: AgentMessageRole;
    content: string;
    /** Streamed during the turn (assistant only). Empty array for user
     *  messages and freshly-created pending assistant rows. */
    events: AgentEvent[];
    /** USD cost. Set when the assistant turn finalizes; 0 for user
     *  messages and pending rows. */
    cost: number;
    /** Token usage for the turn. Optional for backwards-compat with
     *  rows persisted before token tracking was wired in. */
    tokens?: AgentMessageTokens;
    /** Lifecycle. User messages start (and stay) 'completed' so the
     *  client can treat status uniformly. */
    status: AgentMessageStatus;
    createdAt: Date;
    finalizedAt?: Date;
}

// ─── wire shapes (client-facing) ─────────────────────────────────────────

export interface AgentConversationClient {
    id: string;
    title: string;
    modelId: string;
    sessionId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AgentMessageClient {
    id: string;
    conversationId: string;
    role: AgentMessageRole;
    content: string;
    events: AgentEvent[];
    cost: number;
    tokens: AgentMessageTokens | null;
    status: AgentMessageStatus;
    createdAt: string;
    finalizedAt: string | null;
}
