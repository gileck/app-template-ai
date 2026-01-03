/**
 * Boot Performance Logger
 * 
 * Tracks and logs timing metrics for app initialization phases.
 * Helps diagnose slow startups and identify bottlenecks.
 * 
 * All boot logs are captured via the session logger and included in bug reports.
 */

import { logger } from '@/client/features/session-logs';

interface BootMetric {
    phase: string;
    startTime: number;
    endTime?: number;
    duration?: number;
}

interface BootPerformance {
    appStartTime: number;
    metrics: Map<string, BootMetric>;
    isLoggingEnabled: boolean;
}

// Global singleton for boot performance tracking
const bootPerf: BootPerformance = {
    appStartTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    metrics: new Map(),
    isLoggingEnabled: typeof window !== 'undefined' && 
        (localStorage.getItem('debug:boot-performance') === 'true' || 
         process.env.NODE_ENV === 'development'),
};

/**
 * Mark the start of a boot phase
 */
export function markPhaseStart(phase: string): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - bootPerf.appStartTime;
    
    bootPerf.metrics.set(phase, {
        phase,
        startTime: now,
    });
    
    // Always log to session logger for bug reports
    logger.info('boot', `▶ ${phase} started`, {
        meta: { phase, elapsedMs: Math.round(elapsed) }
    });
    
    if (bootPerf.isLoggingEnabled) {
        console.log(`[Boot] ▶ ${phase} started at +${elapsed.toFixed(0)}ms`);
    }
}

/**
 * Mark the end of a boot phase
 */
export function markPhaseEnd(phase: string): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - bootPerf.appStartTime;
    const metric = bootPerf.metrics.get(phase);
    
    if (metric) {
        metric.endTime = now;
        metric.duration = now - metric.startTime;
        
        // Always log to session logger for bug reports
        logger.info('boot', `✓ ${phase} completed`, {
            meta: { phase, durationMs: Math.round(metric.duration), totalElapsedMs: Math.round(elapsed) }
        });
        
        if (bootPerf.isLoggingEnabled) {
            console.log(`[Boot] ✓ ${phase} completed in ${metric.duration.toFixed(0)}ms (total: +${elapsed.toFixed(0)}ms)`);
        }
    }
}

/**
 * Mark a single event (instant, no duration)
 */
export function markEvent(event: string): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - bootPerf.appStartTime;
    
    bootPerf.metrics.set(event, {
        phase: event,
        startTime: now,
        endTime: now,
        duration: 0,
    });
    
    // Always log to session logger for bug reports
    logger.info('boot', `● ${event}`, {
        meta: { event, elapsedMs: Math.round(elapsed) }
    });
    
    if (bootPerf.isLoggingEnabled) {
        console.log(`[Boot] ● ${event} at +${elapsed.toFixed(0)}ms`);
    }
}

/**
 * Log status information (not a timing event, just info)
 */
export function logStatus(label: string, data: Record<string, unknown>): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - bootPerf.appStartTime;
    
    // Always log to session logger for bug reports (regardless of isLoggingEnabled)
    logger.info('boot', `📋 ${label}`, {
        meta: { ...data, elapsedMs: Math.round(elapsed) }
    });
    
    // Console output only when enabled
    if (bootPerf.isLoggingEnabled) {
        const formatted = Object.entries(data)
            .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
            .join(', ');
        
        console.log(`[Boot] 📋 ${label} at +${elapsed.toFixed(0)}ms: ${formatted}`);
    }
}

/**
 * Print a summary of all boot metrics
 */
export function printBootSummary(): void {
    const totalTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - bootPerf.appStartTime;
    
    const sortedMetrics = Array.from(bootPerf.metrics.values())
        .sort((a, b) => a.startTime - b.startTime);
    
    // Build summary data for session logger
    const metricsData: Record<string, number | string> = {
        totalBootTimeMs: Math.round(totalTime),
    };
    
    for (const metric of sortedMetrics) {
        const startOffset = Math.round(metric.startTime - bootPerf.appStartTime);
        if (metric.duration !== undefined && metric.duration > 0) {
            metricsData[metric.phase] = `${Math.round(metric.duration)}ms at +${startOffset}ms`;
        } else {
            metricsData[metric.phase] = `instant at +${startOffset}ms`;
        }
    }
    
    // Always log to session logger for bug reports
    logger.info('boot', '📊 Performance Summary', { meta: metricsData });
    
    // Console output only when enabled
    if (bootPerf.isLoggingEnabled) {
        console.group('[Boot] 📊 Performance Summary');
        console.log(`Total boot time: ${totalTime.toFixed(0)}ms`);
        console.log('');
        console.log('Phase breakdown:');
        
        for (const metric of sortedMetrics) {
            const startOffset = (metric.startTime - bootPerf.appStartTime).toFixed(0);
            if (metric.duration !== undefined && metric.duration > 0) {
                console.log(`  ${metric.phase}: ${metric.duration.toFixed(0)}ms (started at +${startOffset}ms)`);
            } else {
                console.log(`  ${metric.phase}: instant (at +${startOffset}ms)`);
            }
        }
        
        console.groupEnd();
    }
}

/**
 * Get all metrics (for debugging/display)
 */
export function getBootMetrics(): BootMetric[] {
    return Array.from(bootPerf.metrics.values());
}

/**
 * Get total boot time so far
 */
export function getTotalBootTime(): number {
    return (typeof performance !== 'undefined' ? performance.now() : Date.now()) - bootPerf.appStartTime;
}

/**
 * Enable/disable boot logging at runtime
 */
export function setBootLoggingEnabled(enabled: boolean): void {
    bootPerf.isLoggingEnabled = enabled;
    if (typeof window !== 'undefined') {
        if (enabled) {
            localStorage.setItem('debug:boot-performance', 'true');
        } else {
            localStorage.removeItem('debug:boot-performance');
        }
    }
}

// Export constants for phase names
export const BOOT_PHASES = {
    // Core initialization
    APP_MOUNT: 'App Mount',
    QUERY_PROVIDER_INIT: 'QueryProvider Init',
    STORE_HYDRATION: 'Zustand Store Hydration',
    
    // Auth flow
    AUTH_PREFLIGHT_START: 'Auth Preflight Start',
    AUTH_PREFLIGHT_COMPLETE: 'Auth Preflight Complete',
    AUTH_VALIDATION_START: 'Auth Validation Start',
    AUTH_VALIDATION_COMPLETE: 'Auth Validation Complete',
    
    // UI states
    BOOT_GATE_WAITING: 'BootGate Waiting',
    BOOT_GATE_PASSED: 'BootGate Passed',
    AUTH_WRAPPER_RENDER: 'AuthWrapper Render',
    LOGIN_FORM_SHOWN: 'Login Form Shown',
    APP_CONTENT_SHOWN: 'App Content Shown',
    APP_CONTENT_SHOWN_INSTANT: 'App Content Shown (Instant Boot)',
    APP_CONTENT_SHOWN_VALIDATED: 'App Content Shown (Validated)',
    HOME_PAGE_READY: 'Home Page Ready',
} as const;
