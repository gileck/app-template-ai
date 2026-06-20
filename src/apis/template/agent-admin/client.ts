import apiClient from '@/client/utils/apiClient';
import {
    API_GET_AGENT_ANALYTICS,
    API_GET_AI_USAGE_CONSOLE,
    API_GET_TOOL_REPORT,
    API_LIST_AGENT_TRACES,
    API_GET_AGENT_TRACE,
} from './index';
import type {
    GetAgentAnalyticsRequest,
    GetAgentAnalyticsResponse,
    GetAiUsageConsoleRequest,
    GetAiUsageConsoleResponse,
    GetToolReportRequest,
    GetToolReportResponse,
    ListAgentTracesRequest,
    ListAgentTracesResponse,
    GetAgentTraceRequest,
    GetAgentTraceResponse,
} from './types';

export const getAgentAnalytics = (params: GetAgentAnalyticsRequest = {}) => {
    return apiClient.call<GetAgentAnalyticsResponse, GetAgentAnalyticsRequest>(
        API_GET_AGENT_ANALYTICS,
        params
    );
};

export const getAiUsageConsole = (params: GetAiUsageConsoleRequest = {}) => {
    return apiClient.call<GetAiUsageConsoleResponse, GetAiUsageConsoleRequest>(
        API_GET_AI_USAGE_CONSOLE,
        params
    );
};

export const getToolReport = (params: GetToolReportRequest = {}) => {
    return apiClient.call<GetToolReportResponse, GetToolReportRequest>(
        API_GET_TOOL_REPORT,
        params
    );
};

export const listAgentTraces = (params: ListAgentTracesRequest = {}) => {
    return apiClient.call<ListAgentTracesResponse, ListAgentTracesRequest>(
        API_LIST_AGENT_TRACES,
        params
    );
};

export const getAgentTrace = (params: GetAgentTraceRequest) => {
    return apiClient.call<GetAgentTraceResponse, GetAgentTraceRequest>(
        API_GET_AGENT_TRACE,
        params
    );
};
