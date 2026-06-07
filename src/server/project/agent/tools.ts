/**
 * Demo-agent tool set.
 *
 * Two stubs to prove the tool pipeline + trace events render end-to-end
 * without dragging in any project domain logic. Replace with real tools
 * when wiring a domain agent.
 *
 *   get_time:  trivially-correct read tool. Returns server time.
 *   calculate: structured arithmetic — no eval(), no security risk.
 */

import { z } from 'zod';
import {
    createAskUserTool,
    createToolBuilder,
    type AgenticTool,
} from '@/server/template/agentic';

/** No per-turn data context for the demo. Real agents bind their
 *  `DataContext` here. */
export type DemoAgentDataContext = Record<string, never>;

const tool = createToolBuilder<DemoAgentDataContext>();

const getTime = tool({
    name: 'get_time',
    description:
        'Get the current server time. Use whenever the user asks "what time is it" or needs a timestamp. Returns ISO-8601 UTC.',
    inputSchema: {
        timezone: z
            .string()
            .optional()
            .describe(
                'Optional IANA timezone (e.g. "America/Los_Angeles"). Omit for UTC.'
            ),
    },
    handler: async (args) => {
        const now = new Date();
        try {
            const formatted = args.timezone
                ? now.toLocaleString('en-US', { timeZone: args.timezone })
                : now.toISOString();
            return {
                ok: true,
                data: {
                    iso: now.toISOString(),
                    formatted,
                    timezone: args.timezone ?? 'UTC',
                },
            };
        } catch (err) {
            return {
                ok: false,
                error: `Invalid timezone "${args.timezone}": ${err instanceof Error ? err.message : String(err)}`,
            };
        }
    },
});

const calculate = tool({
    name: 'calculate',
    description:
        'Perform one arithmetic operation on two numbers. Use for any math the user asks about. Returns the result.',
    inputSchema: {
        op: z
            .enum(['add', 'subtract', 'multiply', 'divide'])
            .describe('Which operation to apply.'),
        a: z.number().describe('Left operand.'),
        b: z.number().describe('Right operand.'),
    },
    handler: async (args) => {
        let result: number;
        switch (args.op) {
            case 'add':
                result = args.a + args.b;
                break;
            case 'subtract':
                result = args.a - args.b;
                break;
            case 'multiply':
                result = args.a * args.b;
                break;
            case 'divide':
                if (args.b === 0) {
                    return { ok: false, error: 'Cannot divide by zero.' };
                }
                result = args.a / args.b;
                break;
        }
        return {
            ok: true,
            data: { result, expression: `${args.a} ${args.op} ${args.b} = ${result}` },
        };
    },
});

/** Human-in-the-loop multiple-choice tool. Lets the agent pause the
 *  turn, ask the user to pick option(s), and continue with the answer.
 *  Generic in the template; bound to this agent's data context here. */
const askUser = createAskUserTool<DemoAgentDataContext>();

export const DEMO_AGENT_TOOLS: ReadonlyArray<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous tool shapes
    AgenticTool<any, DemoAgentDataContext>
> = [getTime, calculate, askUser];

export function createDemoDataContext(_userId: string): DemoAgentDataContext {
    return {};
}
