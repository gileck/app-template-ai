/**
 * Agent Admin API Types
 *
 * Wire shapes for the admin agent-observability endpoints. All dates are
 * ISO-8601 strings.
 */

import type {
    RpcJobError,
    TraceEntry,
} from '@/server/database/collections/template/agentTraces/types';

// ─── Feature 1: real agent analytics ────────────────────────────────────────

export interface ModelUsageStat {
    modelId: string;
    turns: number;
    cost: number;
    inputTokens: number;
    outputTokens: number;
}

export interface DailyCostPoint {
    date: string;
    cost: number;
    turns: number;
}

export interface AgentAnalytics {
    turns: {
        total: number;
        completed: number;
        errored: number;
        pending: number;
    };
    /** completed / (completed + errored); 0 when no finished turns. */
    successRate: number;
    /** Mean turn latency in ms (finished traces only). */
    avgLatencyMs: number;
    latencySampleCount: number;
    cost: {
        total: number;
        inputTokens: number;
        outputTokens: number;
    };
    byModel: ModelUsageStat[];
    dailyCost: DailyCostPoint[];
    traceStatus: { started: number; completed: number; errored: number };
    /** Traces stuck at 'started' past the threshold right now. */
    stuckCount: number;
}

export interface GetAgentAnalyticsRequest {
    startDate?: string;
    endDate?: string;
}

export interface GetAgentAnalyticsResponse {
    analytics?: AgentAnalytics;
    error?: string;
}

// ─── Feature 2: AI cost & token console ──────────────────────────────────────

export interface AiUsageGroup {
    key: string;
    cost: number;
    tokens: number;
    count: number;
}

export interface AiUsageDay {
    date: string;
    cost: number;
    tokens: number;
    count: number;
}

export interface TopSpender {
    userId: string;
    username: string;
    cost: number;
    turns: number;
}

export interface AiUsageConsole {
    totals: {
        cost: number;
        tokens: number;
        promptTokens: number;
        completionTokens: number;
        recordCount: number;
        /** S3 scan hit the cap — totals are a partial (most-recent) sample. */
        truncated: boolean;
    };
    byModel: AiUsageGroup[];
    byProvider: AiUsageGroup[];
    byEndpoint: AiUsageGroup[];
    byDay: AiUsageDay[];
    /** Per-user agent spend (from agent turns — the only per-user source). */
    topSpenders: TopSpender[];
}

export interface GetAiUsageConsoleRequest {
    /** Bounds the S3 scan (newest-first). Defaults server-side. */
    maxRecords?: number;
}

export interface GetAiUsageConsoleResponse {
    console?: AiUsageConsole;
    error?: string;
}

// ─── Feature 4: per-tool reliability ─────────────────────────────────────────

export interface ToolReportRow {
    name: string;
    calls: number;
    results: number;
    ok: number;
    failed: number;
    wrote: number;
    truncated: number;
    /** tool_call with no matching tool_result (turn crashed mid-tool). */
    incomplete: number;
    /** ok / results; 0 when no results. */
    successRate: number;
}

export interface GetToolReportRequest {
    startDate?: string;
    endDate?: string;
}

export interface GetToolReportResponse {
    tools?: ToolReportRow[];
    error?: string;
}

// ─── Feature 3: agent trace explorer ─────────────────────────────────────────

export type AgentTraceStatus = 'started' | 'completed' | 'errored';

export interface AgentTraceListRow {
    id: string;
    conversationId: string;
    userId: string;
    username: string;
    status: AgentTraceStatus;
    startedAt: string;
    finishedAt: string | null;
    durationMs: number | null;
    entryCount: number;
    /** Message of the last error-level entry, if any. */
    lastError: string | null;
}

export interface ListAgentTracesRequest {
    /** 'recent' (default) lists newest; 'stuck' lists only crashed-looking. */
    view?: 'recent' | 'stuck';
    status?: AgentTraceStatus;
    limit?: number;
}

export interface ListAgentTracesResponse {
    traces?: AgentTraceListRow[];
    /** Stuck-trace total (for the banner), independent of the view. */
    stuckCount?: number;
    error?: string;
}

export interface AgentTraceDetail {
    id: string;
    conversationId: string;
    userId: string;
    username: string;
    status: AgentTraceStatus;
    startedAt: string;
    finishedAt: string | null;
    durationMs: number | null;
    entries: TraceEntry[];
    /** Smoking gun when status='started' but the rpc job failed. */
    rpcJob?: RpcJobError;
}

export interface GetAgentTraceRequest {
    messageId: string;
}

export interface GetAgentTraceResponse {
    trace?: AgentTraceDetail;
    error?: string;
}
