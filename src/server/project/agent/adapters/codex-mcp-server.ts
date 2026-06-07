/**
 * Codex MCP server bootstrap for the demo-agent.
 *
 * The Codex adapter spawns this script as a stdio subprocess once per
 * turn (see `defaultCodexMcpServerPath` in the agentic template — this
 * path matches the convention). We just hand the tool list + data-
 * context factory to the generic runner and let it speak JSON-RPC.
 */

import {
    runCodexMcpServer,
    buildAgentToolsFromApis,
} from '@/server/template/agentic';
import { apiHandlers } from '@/apis/apis';
import { DEMO_AGENT_TOOLS, createDemoDataContext } from '../tools';

// Same tool list the daemon-side handler computes — kept in sync via
// `buildAgentToolsFromApis(apiHandlers)`, which is referentially stable
// across both call sites since both read the same registry.
const apiTools = buildAgentToolsFromApis({ handlers: apiHandlers });

runCodexMcpServer({
    agentName: 'demo-agent',
    tools: [...DEMO_AGENT_TOOLS, ...apiTools],
    createDataContext: createDemoDataContext,
});
