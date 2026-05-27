/**
 * Agent route — modern chat UX powered by the agentic RPC engine.
 *
 * Layout:
 *   Desktop: two columns — sidebar (conversations) | chat
 *   Mobile:  chat full-width, sidebar in a Sheet drawer
 *
 * Polling: useAgentConversation auto-refetches at 1.5s while any
 * message has status='pending', so the daemon's events stream in as
 * they're persisted to Mongo.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Bot, Terminal, MoreVertical } from 'lucide-react';
import { Button } from '@/client/components/template/ui/button';
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from '@/client/components/template/ui/sheet';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/client/components/template/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/client/components/template/ui/dropdown-menu';
import {
    CLAUDE_CODE_MODELS,
    CODEX_MODELS,
} from '@/common/ai/models';
import { RpcConnectionIndicator } from '@/client/features/template/rpc-connection';
import {
    useAgentUIStore,
    useAgentConversation,
    useAgentConversations,
    useAgentTraces,
    useCreateAgentConversation,
    useSendAgentMessage,
    useCancelAgentMessage,
    useUploadAttachment,
    isPendingMessageStale,
} from '@/client/features/project/agent';
import type { AgentMessageAttachment } from '@/apis/project/agent/types';
import { ConversationSidebar } from './ConversationSidebar';
import { MessageList } from './MessageList';
import {
    MessageInput,
    type AttachmentSlot,
    type MessageInputHandle,
} from './MessageInput';

const AGENT_MODELS = [
    { tier: 'Claude Code', models: CLAUDE_CODE_MODELS },
    { tier: 'Codex', models: CODEX_MODELS },
];

export function Agent() {
    const selectedId = useAgentUIStore((s) => s.selectedConversationId);
    const setSelected = useAgentUIStore((s) => s.setSelectedConversationId);
    const modelId = useAgentUIStore((s) => s.selectedModelId);
    const setModelId = useAgentUIStore((s) => s.setSelectedModelId);
    const verbose = useAgentUIStore((s) => s.verboseMode);
    const setVerbose = useAgentUIStore((s) => s.setVerboseMode);

    // eslint-disable-next-line state-management/prefer-state-architecture -- transient sheet open/close
    const [sheetOpen, setSheetOpen] = useState(false);

    const inputRef = useRef<MessageInputHandle | null>(null);

    // Attachment slots — each picked file becomes a slot that flips
    // through 'uploading' → 'uploaded' (or 'failed'). On send we
    // include only the successfully-uploaded ones.
    // eslint-disable-next-line state-management/prefer-state-architecture -- transient pre-submit composer state
    const [attachmentSlots, setAttachmentSlots] = useState<AttachmentSlot[]>([]);
    const uploadMutation = useUploadAttachment();

    const { data: conversations = [] } = useAgentConversations();
    const conversationQuery = useAgentConversation(selectedId);
    const createMutation = useCreateAgentConversation();
    const sendMutation = useSendAgentMessage();
    const cancelMutation = useCancelAgentMessage(selectedId);

    // Mirror the conversation hook's live-pending check so the trace
    // poll runs at the same cadence — both stop when the message goes
    // stale or finalizes.
    const livePendingMessage =
        conversationQuery.data?.messages.find(
            (m) =>
                m.status === 'pending' &&
                !isPendingMessageStale(m.createdAt)
        );
    const hasLivePending = Boolean(livePendingMessage);

    const tracesQuery = useAgentTraces({
        conversationId: selectedId,
        enabled: verbose,
        hasLivePending,
    });

    // If the persisted selectedId no longer exists (e.g. deleted on
    // another device), clear it so we land on the empty-state instead
    // of an infinite "not found" spinner.
    useEffect(() => {
        if (!selectedId) return;
        if (conversationQuery.isError) setSelected(null);
    }, [conversationQuery.isError, selectedId, setSelected]);

    const messages = conversationQuery.data?.messages ?? [];
    const conversation = conversationQuery.data?.conversation;

    // If the conversation already has a model, prefer it (per-thread
    // memory). Falls back to the picker value for new chats.
    const activeModelId = conversation?.modelId ?? modelId;

    const groupedModels = useMemo(() => AGENT_MODELS, []);

    const patchSlot = (id: string, patch: Partial<AttachmentSlot>) => {
        setAttachmentSlots((cur) =>
            cur.map((s) => (s.id === id ? { ...s, ...patch } : s))
        );
    };

    const handleSend = async (text: string) => {
        // 'uploading' was blocked by MessageInput's submit guard;
        // 'failed' slots are silently dropped (user already saw the
        // toast from the upload mutation).
        const ready: AgentMessageAttachment[] = attachmentSlots
            .filter((s): s is AttachmentSlot & { url: string } =>
                s.status === 'uploaded' && !!s.url
            )
            .map((s) => ({
                url: s.url,
                contentType: s.contentType,
                name: s.name,
                size: s.size ?? 0,
            }));

        let convId = selectedId;
        if (!convId) {
            const created = await createMutation.mutateAsync({
                modelId: activeModelId,
                title: text.slice(0, 80),
            });
            convId = created.id;
        }
        sendMutation.mutate({
            conversationId: convId,
            modelId: activeModelId,
            text,
            attachments: ready.length > 0 ? ready : undefined,
        });
        // Slots have been claimed by the message — clear composer state.
        for (const s of attachmentSlots) {
            if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
        }
        setAttachmentSlots([]);
    };

    const handleAddFiles = (files: File[]) => {
        const newSlots: AttachmentSlot[] = files.map((file) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            contentType: file.type || 'application/octet-stream',
            status: 'uploading',
            previewUrl: file.type.startsWith('image/')
                ? URL.createObjectURL(file)
                : undefined,
        }));
        setAttachmentSlots((cur) => [...cur, ...newSlots]);

        files.forEach((file, idx) => {
            const slotId = newSlots[idx].id;
            uploadMutation.mutate(file, {
                onSuccess: (att) =>
                    patchSlot(slotId, {
                        status: 'uploaded',
                        url: att.url,
                        size: att.size,
                    }),
                onError: (err) =>
                    patchSlot(slotId, {
                        status: 'failed',
                        error: err instanceof Error ? err.message : String(err),
                    }),
            });
        });
    };

    const handleRemoveAttachment = (id: string) => {
        setAttachmentSlots((cur) => {
            const slot = cur.find((s) => s.id === id);
            if (slot?.previewUrl) URL.revokeObjectURL(slot.previewUrl);
            return cur.filter((s) => s.id !== id);
        });
    };

    const handleEditUserMessage = (text: string) => {
        inputRef.current?.setText(text);
    };

    const handleResendUserMessage = (text: string) => {
        handleSend(text);
    };

    return (
        <div className="flex h-[calc(100dvh-3.5rem)] flex-col bg-background sm:h-[100dvh]">
            <div className="flex flex-1 overflow-hidden">
                {/* Desktop sidebar */}
                <aside className="hidden w-72 shrink-0 border-r border-border md:block">
                    <ConversationSidebar />
                </aside>

                {/* Mobile sidebar (Sheet) */}
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetContent side="left" className="w-72 p-0">
                        <SheetTitle className="sr-only">Conversations</SheetTitle>
                        <ConversationSidebar onNavigate={() => setSheetOpen(false)} />
                    </SheetContent>
                </Sheet>

                {/* Main chat column */}
                <main className="flex min-w-0 flex-1 flex-col">
                    {/* Top bar — [Threads] [Title] [RPC] [⋮ menu] */}
                    <header className="flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <Button
                            variant="ghost"
                            size="icon"
                            // Mobile: opens the conversation sheet.
                            // Desktop: sidebar is permanent, button is
                            // hidden — but still rendered for layout
                            // consistency via md:hidden.
                            className="md:hidden"
                            onClick={() => setSheetOpen(true)}
                            aria-label="Open conversations"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>

                        <h1 className="min-w-0 flex-1 truncate text-sm font-medium">
                            {conversation?.title ?? 'AI Agent'}
                        </h1>

                        <RpcConnectionIndicator />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    aria-label="Thread menu"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuLabel>Debug</DropdownMenuLabel>
                                <DropdownMenuCheckboxItem
                                    checked={verbose}
                                    onCheckedChange={(v) => setVerbose(!!v)}
                                >
                                    <Terminal className="mr-2 h-3.5 w-3.5" />
                                    Verbose trace log
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
                                    Model is set below the message input.
                                </DropdownMenuLabel>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </header>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto">
                        {selectedId && conversationQuery.isLoading ? (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                Loading…
                            </div>
                        ) : conversations.length === 0 && !selectedId ? (
                            <EmptyWelcome />
                        ) : (
                            <div className="mx-auto max-w-3xl">
                                <MessageList
                                    messages={messages}
                                    traces={tracesQuery.data}
                                    verbose={verbose}
                                    onEditUserMessage={handleEditUserMessage}
                                    onResendUserMessage={handleResendUserMessage}
                                />
                            </div>
                        )}
                    </div>

                    {/* Input + model picker */}
                    <div className="border-t border-border bg-background">
                        <MessageInput
                            ref={inputRef}
                            onSubmit={handleSend}
                            attachments={attachmentSlots}
                            onAddFiles={handleAddFiles}
                            onRemoveAttachment={handleRemoveAttachment}
                            disabled={createMutation.isPending}
                            isSending={sendMutation.isPending}
                            isAgentRunning={hasLivePending}
                            onCancel={
                                livePendingMessage
                                    ? () =>
                                          cancelMutation.mutate(
                                              livePendingMessage.id
                                          )
                                    : undefined
                            }
                        />
                        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 pb-3 -mt-1">
                            <span className="text-[11px] text-muted-foreground">
                                Model
                            </span>
                            <Select
                                value={activeModelId}
                                onValueChange={(v) => setModelId(v)}
                            >
                                <SelectTrigger className="h-7 w-auto gap-2 border-0 bg-transparent px-2 text-xs text-foreground/80 hover:text-foreground focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="start">
                                    {groupedModels.map(({ tier, models }) => (
                                        <SelectGroup key={tier}>
                                            <SelectLabel>{tier}</SelectLabel>
                                            {models.map((m) => (
                                                <SelectItem
                                                    key={m.id}
                                                    value={m.id}
                                                >
                                                    {m.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

function EmptyWelcome() {
    return (
        <div className="flex h-full items-center justify-center px-6">
            <div className="max-w-md space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Bot className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">AI Agent</h2>
                <p className="text-sm text-muted-foreground">
                    Chat with a tool-using agent powered by the new agentic
                    engine. Type below and a conversation will be created
                    automatically.
                </p>
                <p className="text-xs text-muted-foreground">
                    Tools available: <code className="rounded bg-muted px-1.5 py-0.5">get_time</code>
                    {' · '}
                    <code className="rounded bg-muted px-1.5 py-0.5">calculate</code>
                </p>
            </div>
        </div>
    );
}
