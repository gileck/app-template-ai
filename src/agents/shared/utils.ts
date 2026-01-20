/**
 * Shared utility functions for agents
 */

import { reports } from '@/server/database';
import type {
    SessionLogEntry,
    ReportBrowserInfo,
    PerformanceEntryData,
    BugCategory,
} from '@/server/database/collections/reports/types';

// ============================================================
// TYPE DETECTION
// ============================================================

/**
 * Detect if issue is a bug or feature based on labels
 */
export function getIssueType(labels?: string[]): 'bug' | 'feature' {
    if (!labels) return 'feature';
    return labels.includes('bug') ? 'bug' : 'feature';
}

// ============================================================
// BUG DIAGNOSTICS
// ============================================================

/**
 * Bug diagnostic data extracted from report
 */
export interface BugDiagnostics {
    category?: BugCategory;
    sessionLogs?: SessionLogEntry[];
    browserInfo?: ReportBrowserInfo;
    stackTrace?: string;
    errorMessage?: string;
    performanceEntries?: PerformanceEntryData[];
    route?: string;
    networkStatus?: 'online' | 'offline';
}

/**
 * Get bug diagnostic data if issue is linked to a bug report
 * Returns null if not a bug or no diagnostics available
 */
export async function getBugDiagnostics(issueNumber: number): Promise<BugDiagnostics | null> {
    try {
        // Query MongoDB reports collection by githubIssueNumber
        const report = await reports.findByGitHubIssueNumber(issueNumber);
        if (!report || report.type !== 'bug') {
            return null;
        }

        return {
            category: report.category,
            sessionLogs: report.sessionLogs,
            browserInfo: report.browserInfo,
            stackTrace: report.stackTrace,
            errorMessage: report.errorMessage,
            performanceEntries: report.performanceEntries,
            route: report.route,
            networkStatus: report.networkStatus,
        };
    } catch (error) {
        console.error('Error fetching bug diagnostics:', error);
        return null;
    }
}

/**
 * Format session logs for inclusion in prompts
 */
export function formatSessionLogs(logs: SessionLogEntry[], limit?: number): string {
    const logsToFormat = limit ? logs.slice(-limit) : logs;

    return logsToFormat
        .map((log) => {
            const time = new Date(log.timestamp).toISOString();
            const emoji = log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : 'ℹ️';
            const meta = log.meta ? ` | ${JSON.stringify(log.meta)}` : '';
            return `${emoji} [${time}] [${log.level}] ${log.feature}: ${log.message}${meta}`;
        })
        .join('\n');
}
