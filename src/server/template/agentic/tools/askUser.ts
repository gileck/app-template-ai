/**
 * `ask_user` — a human-in-the-loop multiple-choice tool.
 *
 * When the agent calls this, it presents the user a question with a set
 * of options and BLOCKS the turn until the user submits a selection.
 * This works because tools run inside the long-lived RPC daemon (not a
 * request/response Lambda): the SDK keeps the agent's turn open while
 * the tool's Promise is pending, so we can simply poll the question row
 * until the user answers — no session-resume gymnastics.
 *
 * Flow:
 *   1. Tool handler writes a 'pending' agentQuestions row keyed by the
 *      assistant message id (`ctx.sourceMessageId`).
 *   2. The client surfaces the row (via getConversation) and renders an
 *      interactive multi-select widget under the assistant bubble.
 *   3. The user submits → the answerQuestion API flips the row to
 *      'answered' with their selection.
 *   4. This handler's poll loop sees 'answered' and returns the chosen
 *      option strings to the agent, which continues the turn.
 *
 * Correlation is by the question's own id (surfaced to the client), not
 * the adapter's per-call id — so this needs ZERO adapter changes and
 * works identically under the Claude Code and Codex adapters.
 */

import { z } from 'zod';
import { ObjectId } from 'mongodb';
import {
    createQuestion,
    expireQuestion,
    findQuestionById,
} from '@/server/database/collections/template/agentQuestions/agentQuestions';
import { defineTool } from '../defineTool';
import type { AgenticTool } from '../types';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const askUserInputSchema = {
    question: z
        .string()
        .min(1)
        .describe('The question to ask the user.'),
    options: z
        .array(z.string().min(1))
        .min(2)
        .max(12)
        .describe('The options the user picks from (2–12 distinct strings).'),
    allowMultiple: z
        .boolean()
        .optional()
        .describe(
            'If true, the user may select more than one option. Defaults to false (single choice).'
        ),
    minSelections: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe(
            'Minimum options the user must select. Only meaningful when allowMultiple is true. Defaults to 1.'
        ),
    maxSelections: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
            'Maximum options the user may select. Only meaningful when allowMultiple is true. Defaults to the number of options.'
        ),
} as const;

export interface AskUserToolOptions {
    /** How long to block waiting for an answer before giving up.
     *  Defaults to 5 minutes. */
    timeoutMs?: number;
    /** Poll cadence while waiting. Defaults to 1s. */
    pollIntervalMs?: number;
}

/**
 * Build the `ask_user` tool. Generic over the project's tool data
 * context — the tool itself only uses identity fields on the context
 * (userId / conversationId / sourceMessageId), so it composes with any
 * `TData`.
 */
export function createAskUserTool<TData = unknown>(
    options: AskUserToolOptions = {}
): AgenticTool<typeof askUserInputSchema, TData> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

    return defineTool<typeof askUserInputSchema, TData>({
        name: 'ask_user',
        description:
            'Ask the user a multiple-choice question and WAIT for their answer. ' +
            'Use this whenever you need the user to choose among concrete options before you can continue — ' +
            'disambiguating intent, picking from candidates, or confirming a subset. ' +
            'Set allowMultiple=true to let them select more than one option. ' +
            'Returns the exact option strings the user selected. ' +
            'Prefer this over asking in plain text when the answer is a choice among known options.',
        inputSchema: askUserInputSchema,
        handler: async (args, ctx) => {
            // De-dupe while preserving order; need >=2 distinct choices.
            const seen = new Set<string>();
            const opts: string[] = [];
            for (const raw of args.options) {
                const opt = raw.trim();
                if (opt && !seen.has(opt)) {
                    seen.add(opt);
                    opts.push(opt);
                }
            }
            if (opts.length < 2) {
                return {
                    ok: false,
                    error: 'Provide at least 2 distinct, non-empty options.',
                };
            }

            const allowMultiple = args.allowMultiple ?? false;
            const minSelections = allowMultiple
                ? Math.min(opts.length, Math.max(0, args.minSelections ?? 1))
                : 1;
            const maxSelections = allowMultiple
                ? Math.min(opts.length, Math.max(1, args.maxSelections ?? opts.length))
                : 1;
            if (maxSelections < minSelections) {
                return {
                    ok: false,
                    error: 'maxSelections must be greater than or equal to minSelections.',
                };
            }

            const questionId = await createQuestion({
                userId: new ObjectId(ctx.userId),
                conversationId: ctx.conversationId,
                messageId: new ObjectId(ctx.sourceMessageId),
                question: args.question.trim(),
                options: opts,
                allowMultiple,
                minSelections,
                maxSelections,
            });

            // Block until the user answers, the question is cancelled,
            // or we time out. Safe to block here — the daemon is a
            // long-lived process and the SDK holds the turn open.
            const deadline = Date.now() + timeoutMs;
            while (Date.now() < deadline) {
                const q = await findQuestionById(questionId);
                if (!q) {
                    return {
                        ok: false,
                        error: 'The question was removed before it was answered.',
                    };
                }
                if (q.status === 'answered') {
                    return {
                        ok: true,
                        data: {
                            question: q.question,
                            selected: q.selected,
                        },
                    };
                }
                if (q.status === 'cancelled') {
                    return {
                        ok: false,
                        error: 'The user dismissed the question without answering.',
                    };
                }
                await sleep(pollIntervalMs);
            }

            await expireQuestion(questionId);
            return {
                ok: false,
                error: 'Timed out waiting for the user to answer the question.',
            };
        },
    });
}
