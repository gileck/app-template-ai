/**
 * Agent Admin API Names
 *
 * Admin-only observability over the in-app AI agent: real analytics
 * (Feature 1), an AI cost & token console (Feature 2), an agent trace
 * explorer + stuck-turn triage (Feature 3), and a per-tool reliability
 * report (Feature 4). All endpoints are admin-gated via the `admin/`
 * name prefix (see processApiCall).
 */

export const name = 'agent-admin';

export const API_GET_AGENT_ANALYTICS = 'admin/agent/getAnalytics';
export const API_GET_AI_USAGE_CONSOLE = 'admin/agent/getCostConsole';
export const API_GET_TOOL_REPORT = 'admin/agent/getToolReport';
export const API_LIST_AGENT_TRACES = 'admin/agent/listTraces';
export const API_GET_AGENT_TRACE = 'admin/agent/getTrace';

/**
 * A trace still at status='started' older than this almost certainly
 * crashed silently (the pipeline never reached finishTrace). Drives the
 * "stuck turns" banner + triage view.
 */
export const STUCK_TRACE_THRESHOLD_MS = 3 * 60 * 1000;
