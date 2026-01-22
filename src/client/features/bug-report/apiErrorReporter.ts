import { getSessionLogs } from '@/client/features/session-logs';

/**
 * Check if we're in production environment
 */
function isProduction(): boolean {
    if (typeof window === 'undefined') return false;

    // Check if running on localhost or development
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
        return false;
    }

    return true;
}

/**
 * Submit an automatic error report for API errors
 * Only submits in production environments
 */
export async function submitApiErrorReport(
    apiName: string,
    errorMessage: string,
    params?: unknown
): Promise<void> {
    // Only report in production
    if (!isProduction()) {
        return;
    }

    try {
        // Generate error key for deduplication
        const errorKey = `api:${apiName}:${errorMessage}`;

        // Get browser info
        const browserInfo = {
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
            language: navigator.language,
        };

        // Get current route
        const route = window.location.pathname;

        // Get network status
        const networkStatus = navigator.onLine ? 'online' as const : 'offline' as const;

        // Get session logs (last 500 entries)
        const sessionLogs = getSessionLogs();

        // Submit report
        const response = await fetch('/api/process/reports_create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                params: {
                    type: 'error',
                    errorMessage,
                    apiName,
                    errorKey,
                    description: `API Error: ${apiName}\n\nParams: ${JSON.stringify(params, null, 2)}`,
                    sessionLogs,
                    browserInfo,
                    route,
                    networkStatus,
                },
            }),
        });

        if (!response.ok) {
            console.warn('Failed to submit API error report:', response.statusText);
        }
    } catch (error) {
        // Silently fail - don't want error reporting to cause more errors
        console.warn('Error submitting API error report:', error);
    }
}
