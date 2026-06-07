/**
 * The app's agent RPC handler (template demo: a generic assistant).
 *
 * Convention: every app's agent lives at `src/server/project/agent/`.
 * The template's `agent/sendMessage` enqueues this exact handler path,
 * and the Codex adapter spawns the sibling `adapters/codex-mcp-server.ts`
 * by the same convention — so there is NO synced override seam. Customize
 * this folder in place (or via `build-app-agent`): `SYSTEM_PROMPT` below
 * is the agent's identity, and `tools.ts` + the opted-in `apiMeta` APIs
 * are its capabilities. `createAgentHandler` picks the first adapter that
 * `supportsModel(modelId)`.
 */

import {
    createAgentHandler,
    initClaudeCode,
    initCodex,
    buildAgentToolsFromApis,
} from '@/server/template/agentic';
import { agentConversations } from '@/server/database';
import { apiHandlers } from '@/apis/apis';
import { DEMO_AGENT_TOOLS, createDemoDataContext } from './tools';

const AGENT_NAME = 'demo-agent';

// The agent's identity + tool cues — what `build-app-agent` rewrites per
// app. The per-turn `request.systemPrompt` (rare) overrides it; otherwise
// every turn uses this.
const SYSTEM_PROMPT =
    'You are a helpful assistant. You have these tools available: ' +
    'get_time (returns the current server time, optionally in a given timezone), ' +
    'calculate (one arithmetic operation on two numbers), and ' +
    'ask_user (ask the user one or more multiple-choice questions and wait for their answer — ' +
    'use it whenever the next step depends on a choice among concrete options; each question ' +
    'can be single-choice or multiSelect, and you may ask several at once). ' +
    'Use them when relevant. Be concise.';

// Auto-generate tools from every API that opted in via `apiMeta`.
// Today: just `todos/getTodos`. Each new opt-in lands automatically
// the next time this module reloads.
const apiTools = buildAgentToolsFromApis({ handlers: apiHandlers });

const handler = createAgentHandler({
    agentName: AGENT_NAME,
    systemPrompt: SYSTEM_PROMPT,
    tools: [...DEMO_AGENT_TOOLS, ...apiTools],
    createDataContext: createDemoDataContext,
    conversations: (userId) =>
        agentConversations.makeAgentConversationsAdapter(userId),
    adapters: [
        initClaudeCode({ agentName: AGENT_NAME }),
        initCodex({
            agentName: AGENT_NAME,
            // No codexMcpServerPath override needed — the default is the
            // convention path `src/server/project/agent/adapters/codex-mcp-server.ts`,
            // which is exactly where this lives.
            codexMcpInstruction:
                'Use the demo_agent MCP tools (get_time, calculate) for any time/math operations. Do not inspect or edit repository files.',
        }),
    ],
});

export default handler;
