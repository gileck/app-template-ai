/**
 * Reports Dashboard
 * 
 * Public dashboard to view and manage bug/error reports.
 */

import { useState } from 'react';
import { useReports, useUpdateReportStatus } from './hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/ui/card';
import { Button } from '@/client/components/ui/button';
import { Badge } from '@/client/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/client/components/ui/select';
import { 
    Bug, 
    AlertCircle, 
    Copy, 
    ChevronDown, 
    ChevronUp, 
    Filter,
    Loader2,
    CheckCircle,
    Search,
    Clock,
    XCircle,
    Layers,
    List,
    Gauge
} from 'lucide-react';
import type { ReportClient, ReportType, ReportStatus } from '@/apis/reports/types';

// Types for grouped view
interface GroupedReport {
    key: string; // error message or description
    type: ReportType;
    count: number;
    firstOccurrence: string;
    lastOccurrence: string;
    reports: ReportClient[];
}

const STATUS_COLORS: Record<ReportStatus, string> = {
    new: 'bg-blue-500',
    investigating: 'bg-yellow-500',
    resolved: 'bg-green-500',
    closed: 'bg-gray-500',
};

const STATUS_ICONS: Record<ReportStatus, React.ReactNode> = {
    new: <AlertCircle className="h-3 w-3" />,
    investigating: <Search className="h-3 w-3" />,
    resolved: <CheckCircle className="h-3 w-3" />,
    closed: <XCircle className="h-3 w-3" />,
};

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
}

function ReportCard({ report }: { report: ReportClient }) {
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral UI state
    const [isExpanded, setIsExpanded] = useState(false);
    const updateStatusMutation = useUpdateReportStatus();

    const handleCopyDetails = async () => {
        const sessionLogsFormatted = report.sessionLogs.length > 0
            ? report.sessionLogs.map(log => 
                `  [${log.timestamp}]${log.performanceTime !== undefined ? ` [+${log.performanceTime}ms]` : ''} [${log.level.toUpperCase()}] [${log.feature}] ${log.message}${log.meta ? ` | Meta: ${JSON.stringify(log.meta)}` : ''}${log.route ? ` | Route: ${log.route}` : ''} | Network: ${log.networkStatus}`
            ).join('\n')
            : '  No session logs';

        const performanceEntriesFormatted = report.performanceEntries && report.performanceEntries.length > 0
            ? report.performanceEntries.map(entry => 
                `  [${entry.entryType}] ${entry.name} | Start: ${entry.startTime}ms | Duration: ${entry.duration}ms${entry.transferSize ? ` | Size: ${entry.transferSize}B` : ''}`
            ).join('\n')
            : null;

        const details = `
================================================================================
BUG/ERROR REPORT
================================================================================

REPORT METADATA
---------------
- Report ID: ${report._id}
- Type: ${report.type.toUpperCase()}${report.category ? ` (${report.category})` : ''}
- Status: ${report.status}
- Created: ${formatDate(report.createdAt)}
- Updated: ${formatDate(report.updatedAt)}

CONTEXT
-------
- Route/Page: ${report.route}
- Network Status: ${report.networkStatus}

${report.description ? `DESCRIPTION
-----------
${report.description}
` : ''}
${report.errorMessage ? `ERROR MESSAGE
-------------
${report.errorMessage}
` : ''}
${report.stackTrace ? `STACK TRACE
-----------
${report.stackTrace}
` : ''}
USER INFORMATION
----------------
${report.userInfo ? `- User ID: ${report.userInfo.userId || 'N/A'}
- Username: ${report.userInfo.username || 'N/A'}
- Email: ${report.userInfo.email || 'N/A'}` : '- User: Anonymous (not logged in)'}

BROWSER/DEVICE INFORMATION
--------------------------
- User Agent: ${report.browserInfo.userAgent}
- Viewport: ${report.browserInfo.viewport.width}x${report.browserInfo.viewport.height}
- Language: ${report.browserInfo.language}

${report.screenshot ? `SCREENSHOT
----------
${report.screenshot.startsWith('data:') 
    ? `[Base64 image data - ${Math.round(report.screenshot.length / 1024)}KB]` 
    : report.screenshot}
` : ''}
${performanceEntriesFormatted ? `PERFORMANCE ENTRIES (${report.performanceEntries?.length || 0} entries)
--------------------------------------------------------
${performanceEntriesFormatted}
` : ''}
SESSION LOGS (${report.sessionLogs.length} entries)
--------------------------------------------------
${sessionLogsFormatted}

================================================================================
END OF REPORT
================================================================================
        `.trim();

        try {
            await navigator.clipboard.writeText(details);
            // Could show a toast here
        } catch {
            // Fallback for older browsers
            console.error('Failed to copy to clipboard');
        }
    };

    const handleCopyId = async () => {
        try {
            await navigator.clipboard.writeText(report._id);
        } catch {
            console.error('Failed to copy ID to clipboard');
        }
    };

    const handleStatusChange = (newStatus: ReportStatus) => {
        updateStatusMutation.mutate({ reportId: report._id, status: newStatus });
    };

    return (
        <Card className="mb-4">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        {report.type === 'bug' && report.category === 'performance' ? (
                            <Gauge className="h-5 w-5 text-purple-500" />
                        ) : report.type === 'bug' ? (
                            <Bug className="h-5 w-5 text-red-500" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                        )}
                        <CardTitle className="text-base">
                            {report.type === 'bug' && report.category === 'performance' 
                                ? 'Performance Issue' 
                                : report.type === 'bug' 
                                    ? 'Bug Report' 
                                    : 'Error'}
                        </CardTitle>
                        <Badge variant="outline" className={`${STATUS_COLORS[report.status]} text-white`}>
                            <span className="mr-1">{STATUS_ICONS[report.status]}</span>
                            {report.status}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDate(report.createdAt)}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {/* Summary */}
                    <div className="text-sm">
                        {report.description && (
                            <p className="rounded bg-muted px-2 py-1 text-foreground">{report.description}</p>
                        )}
                        {report.errorMessage && (
                            <p className="rounded bg-red-500/10 px-2 py-1 font-mono text-red-600 dark:bg-red-500/20 dark:text-red-400">
                                {report.errorMessage}
                            </p>
                        )}
                    </div>

                    {/* Quick Info */}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded bg-muted px-2 py-1">
                            Route: {report.route}
                        </span>
                        <span className="rounded bg-muted px-2 py-1">
                            Network: {report.networkStatus}
                        </span>
                        {report.userInfo?.username && (
                            <span className="rounded bg-muted px-2 py-1">
                                User: {report.userInfo.username}
                            </span>
                        )}
                        {report.performanceEntries && report.performanceEntries.length > 0 && (
                            <span className="rounded bg-purple-500/20 px-2 py-1 text-purple-600 dark:text-purple-400">
                                <Gauge className="mr-1 inline h-3 w-3" />
                                {report.performanceEntries.length} perf entries
                            </span>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? (
                                <>
                                    <ChevronUp className="mr-1 h-4 w-4" />
                                    Less
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="mr-1 h-4 w-4" />
                                    More
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyId}
                            title="Copy report ID for debugging"
                        >
                            <Copy className="mr-1 h-4 w-4" />
                            Copy ID
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyDetails}
                        >
                            <Copy className="mr-1 h-4 w-4" />
                            Copy Details
                        </Button>
                        <Select
                            value={report.status}
                            onValueChange={(value) => handleStatusChange(value as ReportStatus)}
                            disabled={updateStatusMutation.isPending}
                        >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="investigating">Investigating</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                        <div className="mt-4 space-y-4 border-t pt-4">
                            {/* Screenshot */}
                            {report.screenshot && (
                                <div>
                                    <h4 className="mb-2 text-sm font-medium">Screenshot</h4>
                                    {/* eslint-disable-next-line @next/next/no-img-element -- base64 user-uploaded screenshot */}
                                    <img
                                        src={report.screenshot}
                                        alt="Bug screenshot"
                                        className="max-h-64 rounded border object-contain"
                                    />
                                </div>
                            )}

                            {/* Stack Trace */}
                            {report.stackTrace && (
                                <div>
                                    <h4 className="mb-2 text-sm font-medium">Stack Trace</h4>
                                    <pre className="max-h-48 overflow-auto rounded bg-muted p-3 text-xs">
                                        {report.stackTrace}
                                    </pre>
                                </div>
                            )}

                            {/* Browser Info */}
                            <div>
                                <h4 className="mb-2 text-sm font-medium">Browser Info</h4>
                                <div className="rounded bg-muted p-3 text-xs">
                                    <p><strong>User Agent:</strong> {report.browserInfo.userAgent}</p>
                                    <p><strong>Viewport:</strong> {report.browserInfo.viewport.width}x{report.browserInfo.viewport.height}</p>
                                    <p><strong>Language:</strong> {report.browserInfo.language}</p>
                                </div>
                            </div>

                            {/* Session Logs */}
                            {report.sessionLogs.length > 0 && (
                                <div>
                                    <h4 className="mb-2 text-sm font-medium">
                                        Session Logs ({report.sessionLogs.length})
                                    </h4>
                                    <div className="max-h-64 overflow-auto rounded bg-muted p-3">
                                        {report.sessionLogs.map((log) => (
                                            <div
                                                key={log.id}
                                                className={`mb-1 text-xs ${
                                                    log.level === 'error' ? 'text-destructive' :
                                                    log.level === 'warn' ? 'text-yellow-600' :
                                                    'text-muted-foreground'
                                                }`}
                                            >
                                                <span className="font-mono">
                                                    [{new Date(log.timestamp).toLocaleTimeString()}]
                                                </span>
                                                <span className="ml-1 font-medium">[{log.feature}]</span>
                                                <span className="ml-1">{log.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// Group reports by error message or description
function groupReports(reports: ReportClient[]): GroupedReport[] {
    const groups = new Map<string, GroupedReport>();
    
    for (const report of reports) {
        // Use error message for errors, description for bugs
        const key = report.errorMessage || report.description || 'Unknown';
        
        if (groups.has(key)) {
            const group = groups.get(key)!;
            group.count++;
            group.reports.push(report);
            
            // Update first/last occurrence
            if (new Date(report.createdAt) < new Date(group.firstOccurrence)) {
                group.firstOccurrence = report.createdAt;
            }
            if (new Date(report.createdAt) > new Date(group.lastOccurrence)) {
                group.lastOccurrence = report.createdAt;
            }
        } else {
            groups.set(key, {
                key,
                type: report.type,
                count: 1,
                firstOccurrence: report.createdAt,
                lastOccurrence: report.createdAt,
                reports: [report],
            });
        }
    }
    
    // Sort by last occurrence (most recent first)
    return Array.from(groups.values()).sort(
        (a, b) => new Date(b.lastOccurrence).getTime() - new Date(a.lastOccurrence).getTime()
    );
}

function GroupedReportCard({ group }: { group: GroupedReport }) {
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral UI state
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <Card className="mb-4">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        {group.type === 'bug' ? (
                            <Bug className="h-5 w-5 text-red-500" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                        )}
                        <CardTitle className="text-base">
                            {group.type === 'bug' ? 'Bug Report' : 'Error'}
                        </CardTitle>
                        <Badge variant="secondary" className="bg-purple-500 text-white">
                            {group.count}x
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {/* Error/Description */}
                    {group.type === 'error' ? (
                        <p className="rounded bg-red-500/10 px-2 py-1 font-mono text-sm text-red-600 dark:bg-red-500/20 dark:text-red-400 line-clamp-2">
                            {group.key}
                        </p>
                    ) : (
                        <p className="rounded bg-muted px-2 py-1 text-sm text-foreground line-clamp-2">
                            {group.key}
                        </p>
                    )}

                    {/* Occurrence Info */}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>First: {formatDate(group.firstOccurrence)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Last: {formatDate(group.lastOccurrence)}</span>
                        </div>
                    </div>

                    {/* Expand/Collapse */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="mr-1 h-4 w-4" />
                                Hide {group.count} reports
                            </>
                        ) : (
                            <>
                                <ChevronDown className="mr-1 h-4 w-4" />
                                Show {group.count} reports
                            </>
                        )}
                    </Button>

                    {/* Individual Reports */}
                    {isExpanded && (
                        <div className="mt-4 space-y-2 border-t pt-4">
                            {group.reports.map((report) => (
                                <ReportCard key={report._id} report={report} />
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export function Reports() {
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral filter state
    const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral filter state
    const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral sort state
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral view state
    const [viewMode, setViewMode] = useState<'individual' | 'grouped'>('individual');

    const { data: reports, isLoading, error } = useReports({
        type: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sortOrder,
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Reports Dashboard</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    {viewMode === 'grouped' && reports ? (
                        <span>{groupReports(reports).length} unique errors ({reports.length} total)</span>
                    ) : (
                        <span>{reports?.length || 0} reports</span>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">View:</span>
                    <div className="flex rounded-md border">
                        <Button
                            variant={viewMode === 'individual' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="rounded-r-none"
                            onClick={() => setViewMode('individual')}
                        >
                            <List className="mr-1 h-4 w-4" />
                            Individual
                        </Button>
                        <Button
                            variant={viewMode === 'grouped' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="rounded-l-none"
                            onClick={() => setViewMode('grouped')}
                        >
                            <Layers className="mr-1 h-4 w-4" />
                            Grouped
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <Select
                        value={typeFilter}
                        onValueChange={(value) => setTypeFilter(value as ReportType | 'all')}
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="bug">Bugs</SelectItem>
                            <SelectItem value="error">Errors</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Select
                        value={statusFilter}
                        onValueChange={(value) => setStatusFilter(value as ReportStatus | 'all')}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="investigating">Investigating</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sort:</span>
                    <Select
                        value={sortOrder}
                        onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="desc">Newest First</SelectItem>
                            <SelectItem value="asc">Oldest First</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Reports List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                        <p className="mt-4 text-muted-foreground">
                            Failed to load reports. Please try again.
                        </p>
                    </CardContent>
                </Card>
            ) : reports?.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <p className="mt-4 text-muted-foreground">
                            No reports found. Great job!
                        </p>
                    </CardContent>
                </Card>
            ) : viewMode === 'grouped' ? (
                <div>
                    {groupReports(reports || []).map((group) => (
                        <GroupedReportCard key={group.key} group={group} />
                    ))}
                </div>
            ) : (
                <div>
                    {reports?.map((report) => (
                        <ReportCard key={report._id} report={report} />
                    ))}
                </div>
            )}
        </div>
    );
}

