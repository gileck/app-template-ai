/**
 * MultipleChoiceQuestion
 *
 * Renders a question the agent asked mid-turn as an interactive
 * single- or multi-select widget. While the question is 'pending' the
 * user picks option(s) and submits; once answered/cancelled/expired it
 * renders locked, highlighting what was chosen.
 *
 * Presentational only — the caller owns the answer mutation and passes
 * `onSubmit` + `isSubmitting`. Generic enough for any chat surface that
 * uses the agentic engine's `ask_user` tool.
 */

import { useState } from 'react';
import { Check, HelpCircle, Loader2 } from 'lucide-react';
import { Button } from '@/client/components/template/ui/button';
import { cn } from '@/client/lib/utils';
import type { AgentQuestionClient } from '@/server/database/collections/template/agentQuestions/types';

export interface MultipleChoiceQuestionProps {
    question: AgentQuestionClient;
    onSubmit: (selected: string[]) => void;
    isSubmitting?: boolean;
}

function selectionHint(q: AgentQuestionClient): string {
    if (!q.allowMultiple) return 'Pick one';
    if (q.minSelections === q.maxSelections) {
        return `Pick exactly ${q.minSelections}`;
    }
    if (q.maxSelections >= q.options.length && q.minSelections <= 1) {
        return 'Pick one or more';
    }
    return `Pick ${q.minSelections}–${q.maxSelections}`;
}

function lockedCaption(q: AgentQuestionClient): string | null {
    switch (q.status) {
        case 'answered':
            return null; // selection itself is the caption
        case 'cancelled':
            return 'Dismissed without answering';
        case 'expired':
            return 'Timed out — no answer recorded';
        default:
            return null;
    }
}

export function MultipleChoiceQuestion({
    question,
    onSubmit,
    isSubmitting,
}: MultipleChoiceQuestionProps) {
    const isPending = question.status === 'pending';

    // Local pre-submit selection. For a locked question we show the
    // recorded answer instead.
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral pre-submit form selection, like a text input
    const [selected, setSelected] = useState<string[]>([]);

    const active = isPending ? selected : question.selected;

    const toggle = (option: string) => {
        if (!isPending || isSubmitting) return;
        if (!question.allowMultiple) {
            setSelected([option]);
            return;
        }
        setSelected((cur) =>
            cur.includes(option)
                ? cur.filter((o) => o !== option)
                : cur.length < question.maxSelections
                  ? [...cur, option]
                  : cur
        );
    };

    const count = selected.length;
    const canSubmit =
        isPending &&
        !isSubmitting &&
        count >= question.minSelections &&
        count <= question.maxSelections;

    const caption = lockedCaption(question);

    return (
        <div className="w-full rounded-2xl border border-border bg-card/60 p-3">
            <div className="mb-2 flex items-start gap-2">
                <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                        {question.question}
                    </p>
                    {isPending && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {selectionHint(question)}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                {question.options.map((option) => {
                    const isChosen = active.includes(option);
                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => toggle(option)}
                            disabled={!isPending || isSubmitting}
                            aria-pressed={isChosen}
                            className={cn(
                                'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                                isChosen
                                    ? 'border-primary/50 bg-primary/10 text-foreground'
                                    : 'border-border bg-background text-foreground',
                                isPending &&
                                    !isSubmitting &&
                                    'hover:border-primary/40 hover:bg-muted',
                                (!isPending || isSubmitting) && 'cursor-default'
                            )}
                        >
                            <span
                                className={cn(
                                    'flex h-4 w-4 shrink-0 items-center justify-center border',
                                    question.allowMultiple
                                        ? 'rounded'
                                        : 'rounded-full',
                                    isChosen
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-muted-foreground/40'
                                )}
                            >
                                {isChosen && <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                            <span className="min-w-0 flex-1 break-words">
                                {option}
                            </span>
                        </button>
                    );
                })}
            </div>

            {isPending ? (
                <div className="mt-2.5 flex items-center justify-end">
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => onSubmit(selected)}
                        disabled={!canSubmit}
                        className="h-8 rounded-full px-4"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                Sending…
                            </>
                        ) : (
                            'Submit'
                        )}
                    </Button>
                </div>
            ) : (
                caption && (
                    <p className="mt-2 text-[11px] italic text-muted-foreground">
                        {caption}
                    </p>
                )
            )}
        </div>
    );
}
