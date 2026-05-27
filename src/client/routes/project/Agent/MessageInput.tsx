import {
    forwardRef,
    useImperativeHandle,
    useState,
    useRef,
    useEffect,
    FormEvent,
    KeyboardEvent,
    ChangeEvent,
    ClipboardEvent,
    ReactNode,
} from 'react';
import { ArrowUp, Loader2, Square, Paperclip } from 'lucide-react';
import { Button } from '@/client/components/template/ui/button';
import { Textarea } from '@/client/components/template/ui/textarea';
import {
    AttachmentChip,
    type AttachmentSlot,
} from '@/client/components/template/chat/AttachmentChip';

// AttachmentSlot is re-exported here so existing callers don't have to
// learn the new import path; the canonical declaration is now in the
// shared template component.
export type { AttachmentSlot } from '@/client/components/template/chat/AttachmentChip';

interface MessageInputProps {
    onSubmit: (text: string) => void;
    onCancel?: () => void;
    /** Attachments to display as chips. The parent uploads them and
     *  feeds back state updates. */
    attachments?: AttachmentSlot[];
    onAddFiles?: (files: File[]) => void;
    onRemoveAttachment?: (id: string) => void;
    /** Slot rendered in the bottom toolbar to the right of the
     *  paperclip — typically a model picker or other context control. */
    toolbarLeftSlot?: ReactNode;
    /** True while the user's own send request is still in flight (the
     *  initial POST). Disables the input and shows a spinner. */
    isSending?: boolean;
    /** True while the daemon's run is still in flight (visible to all
     *  clients via DB polling). Swaps the Send button for a Stop
     *  button — the input is still enabled so the user can queue the
     *  next message immediately. */
    isAgentRunning?: boolean;
    disabled?: boolean;
}

/** Imperative handle exposed to the page so the Edit button on a user
 *  message can prefill the textarea + focus it without lifting state. */
export interface MessageInputHandle {
    setText: (text: string) => void;
    focus: () => void;
}

const MAX_TEXTAREA_HEIGHT_PX = 240;
const ACCEPTED_TYPES = 'image/*,application/pdf,text/*,.md,.json,.csv,.log';

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
    function MessageInput(
        {
            onSubmit,
            onCancel,
            attachments = [],
            onAddFiles,
            onRemoveAttachment,
            toolbarLeftSlot,
            disabled,
            isSending,
            isAgentRunning,
        },
        ref
    ) {
        // eslint-disable-next-line state-management/prefer-state-architecture -- text input before submission
        const [value, setValue] = useState('');
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const fileInputRef = useRef<HTMLInputElement>(null);

        useImperativeHandle(
            ref,
            () => ({
                setText: (text) => {
                    setValue(text);
                    requestAnimationFrame(() => {
                        const el = textareaRef.current;
                        if (!el) return;
                        el.focus();
                        el.setSelectionRange(text.length, text.length);
                    });
                },
                focus: () => textareaRef.current?.focus(),
            }),
            []
        );

        useEffect(() => {
            const el = textareaRef.current;
            if (!el) return;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
        }, [value]);

        const submit = (e?: FormEvent) => {
            e?.preventDefault();
            const trimmed = value.trim();
            // Don't allow submit while any attachment is still uploading
            // — the server-side sendMessage would race against an
            // unfinished upload. Require either text or at least one
            // uploaded attachment.
            const hasUploading = attachments.some(
                (a) => a.status === 'uploading'
            );
            const hasUploaded = attachments.some(
                (a) => a.status === 'uploaded'
            );
            if (hasUploading || disabled || isSending) return;
            if (!trimmed && !hasUploaded) return;
            onSubmit(trimmed);
            setValue('');
        };

        const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
            }
        };

        const handleFilesPicked = (e: ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) onAddFiles?.(files);
            // Reset so picking the same filename twice still fires onChange.
            e.target.value = '';
        };

        const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
            if (!onAddFiles) return;
            const items = e.clipboardData?.items;
            if (!items || items.length === 0) return;

            const files: File[] = [];
            let hasTextItem = false;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file) files.push(file);
                } else if (item.kind === 'string') {
                    hasTextItem = true;
                }
            }

            if (files.length === 0) return; // plain-text paste — let it through

            onAddFiles(files);
            // If the clipboard had ONLY file items (e.g. a screenshot),
            // suppress the default — otherwise some browsers paste a
            // placeholder string. Mixed clipboards keep their text part.
            if (!hasTextItem) e.preventDefault();
        };

        const showStop = isAgentRunning && !!onCancel;
        const anyUploading = attachments.some((a) => a.status === 'uploading');
        const hasUsableContent =
            value.trim().length > 0 ||
            attachments.some((a) => a.status === 'uploaded');
        const sendDisabled =
            disabled || isSending || anyUploading || !hasUsableContent;

        return (
            <form
                onSubmit={submit}
                className="mx-auto w-full max-w-3xl px-3 pb-4 pt-2 sm:px-4"
            >
                {/* Composer card — single rounded container holding
                    attachments + textarea + bottom toolbar. */}
                <div className="group relative flex flex-col rounded-[28px] border border-border bg-card shadow-sm transition-all focus-within:border-primary/40 focus-within:shadow-md">
                    {/* Attachment thumbnail strip */}
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-4 pt-3">
                            {attachments.map((att) => (
                                <AttachmentChip
                                    key={att.id}
                                    attachment={att}
                                    variant="card"
                                    onRemove={
                                        onRemoveAttachment
                                            ? () => onRemoveAttachment(att.id)
                                            : undefined
                                    }
                                />
                            ))}
                        </div>
                    )}

                    {/* Textarea */}
                    <Textarea
                        ref={textareaRef}
                        placeholder="Message the agent…"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        disabled={disabled}
                        rows={1}
                        className="min-h-12 resize-none border-0 bg-transparent px-5 pt-4 pb-1 text-[15px] leading-relaxed shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
                    />

                    {/* Bottom toolbar */}
                    <div className="flex items-center gap-1 px-2.5 pb-2.5 pt-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled || !onAddFiles}
                            className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                            aria-label="Attach file"
                            title="Attach file or paste an image"
                        >
                            <Paperclip className="h-[18px] w-[18px]" />
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept={ACCEPTED_TYPES}
                            className="hidden"
                            onChange={handleFilesPicked}
                        />

                        {toolbarLeftSlot && (
                            <div className="flex min-w-0 flex-1 items-center">
                                {toolbarLeftSlot}
                            </div>
                        )}
                        {!toolbarLeftSlot && <div className="flex-1" />}

                        {showStop ? (
                            <Button
                                type="button"
                                size="icon"
                                variant="destructive"
                                onClick={onCancel}
                                className="h-9 w-9 shrink-0 rounded-full"
                                aria-label="Stop agent"
                                title="Stop agent"
                            >
                                <Square className="h-3.5 w-3.5 fill-current" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                size="icon"
                                disabled={sendDisabled}
                                className="h-9 w-9 shrink-0 rounded-full"
                                aria-label="Send message"
                                title="Send message  (Enter)"
                            >
                                {isSending || anyUploading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        );
    }
);
