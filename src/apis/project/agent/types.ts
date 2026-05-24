import type {
    AgentConversationClient,
    AgentMessageClient,
} from '@/server/database/collections/project/agentConversations';
import type { AgentTraceClient } from '@/server/database/collections/template/agentTraces/types';

// Re-export the client shapes so all agent types live under one import.
export type { AgentConversationClient, AgentMessageClient, AgentTraceClient };

// ─── list conversations ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ListConversationsRequest {}

export interface ListConversationsResponse {
    conversations?: AgentConversationClient[];
    error?: string;
}

// ─── get conversation (+ messages) ───────────────────────────────────────

export interface GetConversationRequest {
    conversationId: string;
}

export interface GetConversationResponse {
    conversation?: AgentConversationClient;
    messages?: AgentMessageClient[];
    error?: string;
}

// ─── create conversation ─────────────────────────────────────────────────

export interface CreateConversationRequest {
    title?: string;
    modelId: string;
}

export interface CreateConversationResponse {
    conversation?: AgentConversationClient;
    error?: string;
}

// ─── delete conversation ─────────────────────────────────────────────────

export interface DeleteConversationRequest {
    conversationId: string;
}

export interface DeleteConversationResponse {
    deleted?: boolean;
    error?: string;
}

// ─── cancel message ──────────────────────────────────────────────────────

export interface CancelMessageRequest {
    messageId: string;
}

export interface CancelMessageResponse {
    cancelled?: boolean;
    error?: string;
}

// ─── get traces (verbose mode) ───────────────────────────────────────────

export interface GetTracesRequest {
    conversationId: string;
}

export interface GetTracesResponse {
    traces?: AgentTraceClient[];
    error?: string;
}

// ─── send message ────────────────────────────────────────────────────────

export interface SendMessageRequest {
    conversationId: string;
    modelId: string;
    text: string;
    /** Override the default system prompt for this turn. */
    systemPrompt?: string;
}

export interface SendMessageResponse {
    /** The user message that was just created. */
    userMessage?: AgentMessageClient;
    /** The pending assistant message stub. The daemon fills it in
     *  asynchronously — client polls `getConversation` to see events
     *  appear and the final answer. */
    assistantMessage?: AgentMessageClient;
    error?: string;
}
