/**
 * React Query hooks for the agent feature.
 *
 * Polling strategy: `useAgentConversation` enables a 1.5s refetch
 * interval whenever the conversation has a message with status
 * 'pending' — the daemon is appending events to that row in real time.
 * As soon as the last assistant message finalizes (completed/errored),
 * polling stops.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    cancelMessage,
    createConversation,
    deleteConversation,
    getConversation,
    getTraces,
    listConversations,
    sendMessage,
    uploadAttachment,
} from '@/apis/project/agent/client';
import type {
    AgentConversationClient,
    AgentMessageAttachment,
    AgentMessageClient,
    AgentTraceClient,
    GetConversationResponse,
    SendMessageRequest,
} from '@/apis/project/agent/types';
import { useQueryDefaults } from '@/client/query';
import { errorToast } from '@/client/features/template/error-tracking';
import { toast } from '@/client/components/template/ui/toast';
import { fileToBase64 } from '@/client/utils/fileToBase64';
import { useAgentUIStore } from './store';

const conversationsKey = ['agent', 'conversations'] as const;
const conversationKey = (id: string) =>
    ['agent', 'conversation', id] as const;
const tracesKey = (id: string) => ['agent', 'traces', id] as const;

const POLL_INTERVAL_MS = 1500;
/** After this long, a 'pending' assistant message is considered stuck
 *  (daemon offline / job lost). The UI renders it as a failure and we
 *  stop polling for it — sending another message starts a fresh row. */
const PENDING_STALE_MS = 2 * 60 * 1000;

export function isPendingMessageStale(createdAt: string): boolean {
    return Date.now() - new Date(createdAt).getTime() > PENDING_STALE_MS;
}

export function useAgentConversations() {
    const defaults = useQueryDefaults();
    return useQuery({
        queryKey: conversationsKey,
        queryFn: async (): Promise<AgentConversationClient[]> => {
            const result = await listConversations();
            if (result.data?.error) throw new Error(result.data.error);
            return result.data?.conversations ?? [];
        },
        ...defaults,
        // Failures here should surface as an empty/stale list, not
        // hammer the server with retries — the user can refresh.
        retry: false,
    });
}

export function useAgentConversation(conversationId: string | null) {
    const defaults = useQueryDefaults();
    return useQuery({
        queryKey: conversationKey(conversationId ?? ''),
        enabled: Boolean(conversationId),
        queryFn: async (): Promise<{
            conversation: AgentConversationClient;
            messages: AgentMessageClient[];
        }> => {
            const result = await getConversation({
                conversationId: conversationId as string,
            });
            if (result.data?.error) throw new Error(result.data.error);
            if (!result.data?.conversation) throw new Error('Not found');
            return {
                conversation: result.data.conversation,
                messages: result.data.messages ?? [],
            };
        },
        refetchInterval: (query) => {
            const data = query.state.data as
                | { messages: AgentMessageClient[] }
                | undefined;
            // Only poll for live pending messages — once they go stale
            // the daemon isn't coming back to that row, so polling
            // forever would just waste cycles.
            const hasLivePending = data?.messages.some(
                (m) => m.status === 'pending' && !isPendingMessageStale(m.createdAt)
            );
            return hasLivePending ? POLL_INTERVAL_MS : false;
        },
        ...defaults,
        // Polling already gives us a natural retry cadence — disable
        // React Query's exponential-backoff retries so one network
        // blip doesn't fan out into 3 extra calls per interval.
        retry: false,
        // Don't retry the polling interval either if the request fails.
        refetchIntervalInBackground: false,
    });
}

export function useCreateAgentConversation() {
    const queryClient = useQueryClient();
    const setSelected = useAgentUIStore((s) => s.setSelectedConversationId);

    return useMutation({
        mutationFn: async (input: { title?: string; modelId: string }) => {
            const result = await createConversation(input);
            if (result.data?.error) throw new Error(result.data.error);
            if (!result.data?.conversation) {
                throw new Error('No conversation returned');
            }
            return result.data.conversation;
        },
        onSuccess: (conversation) => {
            queryClient.setQueryData<AgentConversationClient[]>(
                conversationsKey,
                (old) => [conversation, ...(old ?? [])]
            );
            setSelected(conversation.id);
        },
        onError: (err) => {
            errorToast('Failed to create conversation', err);
        },
        retry: false,
    });
}

export function useDeleteAgentConversation() {
    const queryClient = useQueryClient();
    const selectedId = useAgentUIStore((s) => s.selectedConversationId);
    const setSelected = useAgentUIStore((s) => s.setSelectedConversationId);

    return useMutation({
        mutationFn: async (conversationId: string) => {
            const result = await deleteConversation({ conversationId });
            if (result.data?.error) throw new Error(result.data.error);
            return conversationId;
        },
        onMutate: async (conversationId) => {
            await queryClient.cancelQueries({ queryKey: conversationsKey });
            const previous = queryClient.getQueryData<AgentConversationClient[]>(
                conversationsKey
            );
            queryClient.setQueryData<AgentConversationClient[]>(
                conversationsKey,
                (old) => (old ?? []).filter((c) => c.id !== conversationId)
            );
            if (selectedId === conversationId) setSelected(null);
            return { previous };
        },
        onError: (err, _id, context) => {
            if (context?.previous) {
                queryClient.setQueryData(conversationsKey, context.previous);
            }
            errorToast('Failed to delete conversation', err);
        },
        onSuccess: () => {
            toast.success('Conversation deleted');
        },
        onSettled: (_data, _err, conversationId) => {
            queryClient.invalidateQueries({ queryKey: conversationsKey });
            queryClient.removeQueries({
                queryKey: conversationKey(conversationId),
            });
        },
        retry: false,
    });
}

/**
 * Upload a single file as an agent-conversation attachment. Returns
 * the persisted attachment metadata (URL + content type + size +
 * name) that can be attached to a subsequent `sendMessage` call.
 *
 * Reads the file as base64 via FileReader, posts to the upload API
 * (which proxies into Vercel Blob via the project's fileStorageAPI).
 */
export function useUploadAttachment() {
    return useMutation({
        mutationFn: async (file: File): Promise<AgentMessageAttachment> => {
            const base64 = await fileToBase64(file);
            const result = await uploadAttachment({
                name: file.name,
                contentType: file.type || 'application/octet-stream',
                base64,
            });
            if (result.data?.error) throw new Error(result.data.error);
            if (!result.data?.attachment) {
                throw new Error('No attachment returned');
            }
            return result.data.attachment;
        },
        onError: (err) => {
            errorToast('Failed to upload attachment', err);
        },
        retry: false,
    });
}


/**
 * Cancel a pending assistant message. Optimistically flips it to
 * 'errored' in the cache so the UI unblocks immediately; on error we
 * roll back. The actual daemon run continues server-side but its
 * eventual finalize is a no-op against a cancelled row (the
 * `status: 'pending'` filter on finalizeAssistantMessage handles it).
 */
export function useCancelAgentMessage(conversationId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (messageId: string) => {
            const result = await cancelMessage({ messageId });
            if (result.data?.error) throw new Error(result.data.error);
            return messageId;
        },
        onMutate: async (messageId) => {
            if (!conversationId) return { previous: undefined };
            await queryClient.cancelQueries({
                queryKey: conversationKey(conversationId),
            });
            const previous = queryClient.getQueryData<GetConversationResponse>(
                conversationKey(conversationId)
            );
            queryClient.setQueryData<GetConversationResponse>(
                conversationKey(conversationId),
                (old) => {
                    if (!old?.messages) return old;
                    return {
                        ...old,
                        messages: old.messages.map((m) =>
                            m.id === messageId && m.status === 'pending'
                                ? {
                                      ...m,
                                      status: 'errored',
                                      content: 'Cancelled by user.',
                                      finalizedAt: new Date().toISOString(),
                                  }
                                : m
                        ),
                    };
                }
            );
            return { previous };
        },
        onError: (err, _id, context) => {
            if (context?.previous && conversationId) {
                queryClient.setQueryData(
                    conversationKey(conversationId),
                    context.previous
                );
            }
            errorToast('Failed to cancel', err);
        },
        retry: false,
    });
}

/**
 * Trace entries for a conversation (verbose mode). Polls at the same
 * cadence as the conversation hook while any message is live-pending,
 * since new trace entries arrive in real time as the daemon writes
 * them. `enabled` is controlled by the caller so we don't poll the
 * traces endpoint when verbose mode is off.
 */
export function useAgentTraces(input: {
    conversationId: string | null;
    enabled: boolean;
    hasLivePending: boolean;
}) {
    const defaults = useQueryDefaults();
    return useQuery({
        queryKey: tracesKey(input.conversationId ?? ''),
        enabled: Boolean(input.conversationId) && input.enabled,
        queryFn: async (): Promise<AgentTraceClient[]> => {
            const result = await getTraces({
                conversationId: input.conversationId as string,
            });
            if (result.data?.error) throw new Error(result.data.error);
            return result.data?.traces ?? [];
        },
        refetchInterval: input.hasLivePending ? POLL_INTERVAL_MS : false,
        refetchIntervalInBackground: false,
        ...defaults,
        retry: false,
    });
}

/**
 * Sentinel prefix on a temporary message id. The optimistic pair
 * inserted in `onMutate` carries this prefix; `onSuccess` filters them
 * out before splicing in the real server-issued rows. Keeping it
 * stable + searchable in case something needs to clean up stragglers
 * (e.g. a future bulk-clear or test fixture).
 */
const OPTIMISTIC_ID_PREFIX = 'optimistic:';

function buildOptimisticMessages(input: SendMessageRequest): {
    tempBatchId: string;
    userMessage: AgentMessageClient;
    assistantMessage: AgentMessageClient;
} {
    const tempBatchId =
        OPTIMISTIC_ID_PREFIX +
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const userMessage: AgentMessageClient = {
        id: `${tempBatchId}-user`,
        conversationId: input.conversationId,
        role: 'user',
        content: input.text,
        events: [],
        cost: 0,
        tokens: null,
        attachments: input.attachments ?? [],
        status: 'completed',
        createdAt: now,
        finalizedAt: now,
    };
    const assistantMessage: AgentMessageClient = {
        id: `${tempBatchId}-assistant`,
        conversationId: input.conversationId,
        role: 'assistant',
        content: '',
        events: [],
        cost: 0,
        tokens: null,
        attachments: [],
        status: 'pending',
        createdAt: now,
        finalizedAt: null,
    };
    return { tempBatchId, userMessage, assistantMessage };
}

export function useSendAgentMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        // The server returns the user message + the assistant row
        // (which may be `errored` if enqueue failed) on BOTH success
        // and recoverable failures. Bare-error responses (validation,
        // not-found) come back without messages and throw.
        mutationFn: async (input: SendMessageRequest) => {
            const result = await sendMessage(input);
            const data = result.data;
            // No messages came back → unrecoverable. Surface the error.
            if (!data?.userMessage || !data?.assistantMessage) {
                throw new Error(data?.error ?? 'Failed to send message');
            }
            return { input, data };
        },
        // Optimistic insert: render the user bubble + a pending
        // assistant placeholder immediately, while the sendMessage
        // POST round-trips. The UI feels instant; the real ids come
        // back in onSuccess and we swap the rows in-place.
        onMutate: async (input) => {
            const key = conversationKey(input.conversationId);
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData<GetConversationResponse>(key);
            const optimistic = buildOptimisticMessages(input);
            queryClient.setQueryData<GetConversationResponse>(key, (old) => {
                if (!old?.conversation) return old;
                return {
                    ...old,
                    messages: [
                        ...(old.messages ?? []),
                        optimistic.userMessage,
                        optimistic.assistantMessage,
                    ],
                };
            });
            return { previous, tempBatchId: optimistic.tempBatchId };
        },
        onSuccess: ({ input, data }, _vars, context) => {
            // Replace the optimistic pair with the server-issued rows.
            // If the assistant came back already 'errored' (e.g. the
            // RPC gate rejected the enqueue) the bubble renders the
            // error directly — no polling needed.
            queryClient.setQueryData<GetConversationResponse>(
                conversationKey(input.conversationId),
                (old) => {
                    if (!old?.conversation) return old;
                    const tempBatchId = context?.tempBatchId;
                    const cleaned = (old.messages ?? []).filter(
                        (m) => !tempBatchId || !m.id.startsWith(tempBatchId)
                    );
                    return {
                        ...old,
                        messages: [
                            ...cleaned,
                            data.userMessage!,
                            data.assistantMessage!,
                        ],
                    };
                }
            );
            queryClient.invalidateQueries({ queryKey: conversationsKey });
            if (data.assistantMessage!.status === 'errored') {
                errorToast(
                    data.assistantMessage!.content,
                    new Error(data.error ?? data.assistantMessage!.content)
                );
            }
        },
        onError: (err, input, context) => {
            // Roll the optimistic insert back to the pre-mutate state.
            if (context?.previous) {
                queryClient.setQueryData(
                    conversationKey(input.conversationId),
                    context.previous
                );
            }
            errorToast('Failed to send message', err);
        },
        retry: false,
    });
}
