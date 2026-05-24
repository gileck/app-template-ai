/**
 * Codex MCP server bootstrap for the demo-agent.
 *
 * The Codex adapter spawns this script as a stdio subprocess once per
 * turn (see `defaultCodexMcpServerPath` in the agentic template — this
 * path matches the convention). We just hand the tool list + data-
 * context factory to the generic runner and let it speak JSON-RPC.
 */

import { runCodexMcpServer } from '@/server/template/agentic';
import { DEMO_AGENT_TOOLS, createDemoDataContext } from '../tools';

runCodexMcpServer({
    agentName: 'demo-agent',
    tools: DEMO_AGENT_TOOLS,
    createDataContext: createDemoDataContext,
});
