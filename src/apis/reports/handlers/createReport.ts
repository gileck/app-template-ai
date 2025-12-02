import { API_CREATE_REPORT } from '../index';
import { CreateReportRequest, CreateReportResponse } from '../types';
import { reports } from '@/server/database';
import { ApiHandlerContext } from '@/apis/types';

export const createReport = async (
    request: CreateReportRequest,
    context: ApiHandlerContext
): Promise<CreateReportResponse> => {
    try {
        const now = new Date();
        
        // Build user info from context if available
        const userInfo = request.userInfo || (context.userId ? {
            userId: context.userId,
        } : undefined);

        const reportData = {
            type: request.type,
            status: 'new' as const,
            description: request.description,
            screenshot: request.screenshot,
            sessionLogs: request.sessionLogs || [],
            userInfo,
            browserInfo: request.browserInfo,
            route: request.route,
            networkStatus: request.networkStatus,
            stackTrace: request.stackTrace,
            errorMessage: request.errorMessage,
            category: request.category,
            performanceEntries: request.performanceEntries,
            createdAt: now,
            updatedAt: now,
        };

        const newReport = await reports.createReport(reportData);

        // Convert to client format
        const reportClient = {
            _id: newReport._id.toHexString(),
            type: newReport.type,
            status: newReport.status,
            description: newReport.description,
            screenshot: newReport.screenshot,
            sessionLogs: newReport.sessionLogs,
            userInfo: newReport.userInfo,
            browserInfo: newReport.browserInfo,
            route: newReport.route,
            networkStatus: newReport.networkStatus,
            stackTrace: newReport.stackTrace,
            errorMessage: newReport.errorMessage,
            category: newReport.category,
            performanceEntries: newReport.performanceEntries,
            createdAt: newReport.createdAt.toISOString(),
            updatedAt: newReport.updatedAt.toISOString(),
        };

        return { report: reportClient };
    } catch (error: unknown) {
        console.error("Create report error:", error);
        return { error: error instanceof Error ? error.message : "Failed to create report" };
    }
};

export { API_CREATE_REPORT };

