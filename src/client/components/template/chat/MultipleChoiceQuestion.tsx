/**
 * MultipleChoiceQuestion
 *
 * Renders a batch of questions the agent asked mid-turn (one or more,
 * each single- or multi-select) as one interactive widget with a single
 * Submit. While 'pending' the user picks option(s) per question; once
 * answered/cancelled/expired it renders locked, highlighting choices.
 *
 * Presentational only — the caller owns the answer mutation and passes
 * `onSubmit` (per-question selected labels, index-aligned) + `isSubmitting`.
 * Generic enough for any chat surface that uses the agentic engine's
 * `ask_user` tool.
 */

import { useState } from 'react';
import { Check, HelpCircle, Loader2 } from 'lucide-react';
import { Button } from '@/client/components/template/ui/button';
import { cn } from '@/client/lib/utils';
import type {
    AgentQuestionClient,
    AgentSubQuestion,
} from '@/server/database/collections/template/agentQuestions/types';

export interface MultipleChoiceQuestionProps {
    question: AgentQuestionClient;
    /** Per-question selected labels, index-aligned to `question.questions`. */
    onSubmit: (answers: string[][]) => void;
    isSubmitting?: boolean;
}

function selectionHint(q: AgentSubQuestion): string {
    if (!q.multiSelect) return 'Pick one';
    if (q.minSelections === q.maxSelections) {
        return `Pick exactly ${q.minSelections}`;
    }
    if (q.maxSelections >= q.options.length && q.minSelections <= 1) {
        return 'Pick one or more';
    }
    return `Pick ${q.minSelections}–${q.maxSelections}`;
}

function lockedCaption(status: AgentQuestionClient['status']): string | null {
    switch (status) {
        case 'cancelled':
            return 'Dismissed without answering';
        case 'expired':
            return 'Timed out — no answer recorded';
        default:
            return null;
    }
}

function withinBounds(q: AgentSubQuestion, selected: string[]): boolean {
    return (
        selected.length >= q.minSelections && selected.length <= q.maxSelections
    );
}

export function MultipleChoiceQuestion({
    question,
    onSubmit,
    isSubmitting,
}: MultipleChoiceQuestionProps) {
    const isPending = question.status === 'pending';
    const subs = question.questions;

    // Local pre-submit selections, one array per sub-question. For a
    // locked batch we show the recorded answers instead.
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral pre-submit form selection, like a text input
    const [draft, setDraft] = useState<string[][]>(() => subs.map(() => []));

    const active = isPending ? draft : question.answers;

    const toggle = (qIndex: number, label: string) => {
        if (!isPending || isSubmitting) return;
        const sub = subs[qIndex];
        setDraft((cur) => {
            const next = cur.map((a) => [...a]);
            const sel = next[qIndex] ?? [];
            if (!sub.multiSelect) {
                next[qIndex] = [label];
                return next;
            }
            if (sel.includes(label)) {
                next[qIndex] = sel.filter((l) => l !== label);
            } else if (sel.length < sub.maxSelections) {
                next[qIndex] = [...sel, label];
            }
            return next;
        });
    };

    const canSubmit =
        isPending &&
        !isSubmitting &&
        subs.every((sub, i) => withinBounds(sub, draft[i] ?? []));

    const caption = lockedCaption(question.status);

    return (
        <div className="w-full space-y-3 rounded-2xl border border-border bg-card/60 p-3">
            {subs.map((sub, qIndex) => {
                const selected = active[qIndex] ?? [];
                return (
                    <div key={qIndex} className="space-y-2">
                        <div className="flex items-start gap-2">
                            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                                {sub.header && (
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        {sub.header}
                                    </p>
                                )}
                                <p className="text-sm font-medium text-foreground">
                                    {sub.question}
                                </p>
                                {isPending && (
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        {selectionHint(sub)}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            {sub.options.map((option) => {
                                const isChosen = selected.includes(option.label);
                                return (
                                    <button
                                        key={option.label}
                                        type="button"
                                        onClick={() =>
                                            toggle(qIndex, option.label)
                                        }
                                        disabled={!isPending || isSubmitting}
                                        aria-pressed={isChosen}
                                        className={cn(
                                            'flex items-start gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                                            isChosen
                                                ? 'border-primary/50 bg-primary/10 text-foreground'
                                                : 'border-border bg-background text-foreground',
                                            isPending &&
                                                !isSubmitting &&
                                                'hover:border-primary/40 hover:bg-muted',
                                            (!isPending || isSubmitting) &&
                                                'cursor-default'
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border',
                                                sub.multiSelect
                                                    ? 'rounded'
                                                    : 'rounded-full',
                                                isChosen
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-muted-foreground/40'
                                            )}
                                        >
                                            {isChosen && (
                                                <Check
                                                    className="h-3 w-3"
                                                    strokeWidth={3}
                                                />
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block break-words">
                                                {option.label}
                                            </span>
                                            {option.description && (
                                                <span className="mt-0.5 block break-words text-[11px] text-muted-foreground">
                                                    {option.description}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {isPending ? (
                <div className="flex items-center justify-end">
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => onSubmit(draft)}
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
                    <p className="text-[11px] italic text-muted-foreground">
                        {caption}
                    </p>
                )
            )}
        </div>
    );
}
