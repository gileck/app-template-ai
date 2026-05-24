/**
 * Demo-agent RPC handler.
 *
 * The daemon imports this module by path (see
 * `agent-tasks/rpc-daemon/config.json`) and invokes its default export
 * for every demo-agent turn. Wired with both Claude Code and Codex
 * adapters — `createAgentHandler` picks the first adapter that
 * `supportsModel(modelId)`.
 */

import {
    createAgentHandler,
    initClaudeCode,
    initCodex,
} from '@/server/template/agentic';
import { agentConversations } from '@/server/database';
import { DEMO_AGENT_TOOLS, createDemoDataContext } from './tools';

const AGENT_NAME = 'demo-agent';

const handler = createAgentHandler({
    agentName: AGENT_NAME,
    tools: DEMO_AGENT_TOOLS,
    createDataContext: createDemoDataContext,
    conversations: (userId) =>
        agentConversations.makeAgentConversationsAdapter(userId),
    adapters: [
        initClaudeCode({ agentName: AGENT_NAME }),
        initCodex({
            agentName: AGENT_NAME,
            // Explicit override: the template's default path is
            // `src/server/project/<agentName>-agent/adapters/...`,
            // which for agentName='demo-agent' resolves to the
            // non-existent `demo-agent-agent/`. Our folder is just
            // `demo-agent/`, so point Codex at the real file.
            codexMcpServerPath:
                'src/server/project/demo-agent/adapters/codex-mcp-server.ts',
            codexMcpInstruction:
                'Use the demo_agent MCP tools (get_time, calculate) for any time/math operations. Do not inspect or edit repository files.',
        }),
    ],
});

export default handler;
