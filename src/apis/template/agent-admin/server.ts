// Must re-export all exports from index.ts
export * from './index';

import {
    API_GET_AGENT_ANALYTICS,
    API_GET_AI_USAGE_CONSOLE,
    API_GET_TOOL_REPORT,
    API_LIST_AGENT_TRACES,
    API_GET_AGENT_TRACE,
} from './index';
import { getAnalytics } from './handlers/getAnalytics';
import { getCostConsole } from './handlers/getCostConsole';
import { getToolReport } from './handlers/getToolReport';
import { listTraces } from './handlers/listTraces';
import { getTrace } from './handlers/getTrace';

export const agentAdminApiHandlers = {
    [API_GET_AGENT_ANALYTICS]: { process: getAnalytics },
    [API_GET_AI_USAGE_CONSOLE]: { process: getCostConsole },
    [API_GET_TOOL_REPORT]: { process: getToolReport },
    [API_LIST_AGENT_TRACES]: { process: listTraces },
    [API_GET_AGENT_TRACE]: { process: getTrace },
};
