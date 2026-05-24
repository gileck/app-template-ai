import {
    forwardRef,
    useImperativeHandle,
    useState,
    useRef,
    useEffect,
    FormEvent,
    KeyboardEvent,
} from 'react';
import { Send, Loader2, Square } from 'lucide-react';
import { Button } from '@/client/components/template/ui/button';
import { Textarea } from '@/client/components/template/ui/textarea';
import { cn } from '@/client/lib/utils';

interface MessageInputProps {
    onSubmit: (text: string) => void;
    onCancel?: () => void;
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

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
    function MessageInput(
        { onSubmit, onCancel, disabled, isSending, isAgentRunning },
        ref
    ) {
    // eslint-disable-next-line state-management/prefer-state-architecture -- text input before submission
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(
        ref,
        () => ({
            setText: (text) => {
                setValue(text);
                // Focus on the next frame so the value commit lands
                // before we move the caret to the end.
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

    // Auto-grow up to a max.
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
    }, [value]);

    const submit = (e?: FormEvent) => {
        e?.preventDefault();
        const trimmed = value.trim();
        if (!trimmed || disabled || isSending) return;
        onSubmit(trimmed);
        setValue('');
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    };

    const showStop = isAgentRunning && !!onCancel;

    return (
        <form
            onSubmit={submit}
            className={cn(
                'mx-auto flex w-full max-w-3xl items-end gap-2 px-4 pb-4 pt-2'
            )}
        >
            <div className="relative flex-1 rounded-2xl border border-border bg-card focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
                <Textarea
                    ref={textareaRef}
                    placeholder="Message the agent…"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    rows={1}
                    className="min-h-11 resize-none border-0 bg-transparent px-4 py-3 text-sm shadow-none focus-visible:ring-0"
                />
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
                    disabled={disabled || isSending || !value.trim()}
                    className="h-11 w-11 shrink-0 rounded-2xl"
                    aria-label="Send message"
                >
                    {isSending ? (
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
