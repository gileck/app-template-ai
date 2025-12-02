// Must re-export all exports from index.ts
export * from './index';

// Import API name constants from index.ts
import { API_CREATE_REPORT, API_GET_REPORTS, API_GET_REPORT, API_UPDATE_REPORT_STATUS } from './index';

// Import handlers
import { createReport } from './handlers/createReport';
import { getReports } from './handlers/getReports';
import { getReport } from './handlers/getReport';
import { updateReportStatus } from './handlers/updateReportStatus';

// Export consolidated handlers object
export const reportsApiHandlers = {
    [API_CREATE_REPORT]: { process: createReport },
    [API_GET_REPORTS]: { process: getReports },
    [API_GET_REPORT]: { process: getReport },
    [API_UPDATE_REPORT_STATUS]: { process: updateReportStatus },
};

