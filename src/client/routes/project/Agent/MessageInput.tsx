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
} from 'react';
import { Send, Loader2, Square, Paperclip } from 'lucide-react';
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

            // Pull every file-kind item (mainly images from screenshot
            // paste, but PDFs from some apps land here too).
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
            // placeholder string. If text is also present (mixed
            // clipboard from a webpage etc.), let the text paste through
            // normally.
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
                className="mx-auto flex w-full max-w-3xl items-end gap-2 px-4 pb-4 pt-2"
            >
                <div className="relative flex flex-1 flex-col rounded-2xl border border-border bg-card focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 px-2 pt-2">
                            {attachments.map((att) => (
                                <AttachmentChip
                                    key={att.id}
                                    attachment={att}
                                    onRemove={
                                        onRemoveAttachment
                                            ? () => onRemoveAttachment(att.id)
                                            : undefined
                                    }
                                />
                            ))}
                        </div>
                    )}

                    <div className="flex items-end">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled || !onAddFiles}
                            className="h-11 w-11 shrink-0 self-end text-muted-foreground hover:text-foreground"
                            aria-label="Attach file"
                            title="Attach file"
                        >
                            <Paperclip className="h-4 w-4" />
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept={ACCEPTED_TYPES}
                            className="hidden"
                            onChange={handleFilesPicked}
                        />
                        <Textarea
                            ref={textareaRef}
                            placeholder="Message the agent…  (you can paste images)"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            disabled={disabled}
                            rows={1}
                            className="min-h-11 flex-1 resize-none border-0 bg-transparent px-1 py-3 text-sm shadow-none focus-visible:ring-0"
                        />
                    </div>
                </div>
                {showStop ? (
                    <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={onCancel}
                        className="h-11 w-11 shrink-0 rounded-2xl"
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
                        className="h-11 w-11 shrink-0 rounded-2xl"
                        aria-label="Send message"
                    >
                        {isSending || anyUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                )}
            </form>
        );
    }
);

