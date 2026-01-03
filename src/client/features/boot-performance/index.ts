/**
 * Boot Performance Logger
 * 
 * Tracks and logs timing metrics for app initialization phases.
 * Helps diagnose slow startups and identify bottlenecks.
 * 
 * All boot logs are captured via the session logger and included in bug reports.
 * The session logger's performanceTime provides accurate timing from page load.
 * 
 * Timeline explanation:
 *   0ms           - Browser starts loading page (HTML request sent)
 *   ~50-150ms     - JS bundle downloading
 *   ~150-190ms    - JS parsing and compilation
 *   ~190ms+       - First module executes (BUNDLE_LOADED event)
 * 
 * Console commands for debugging:
 *   printPerformanceLogs()    // Pretty print full performance summary
 *   printLogs('boot')         // Show all boot session logs
 *   logNavigationTiming()     // Log browser navigation timing breakdown
 *   logResourceTiming()       // Log all loaded resources with timing
 */

import { logger } from '@/client/features/session-logs';

// Capture bundle load time immediately (before any other code)
// This will be logged when logBundleLoaded() is called
const bundleLoadedAt = typeof performance !== 'undefined' ? performance.now() : 0;

interface BootMetric {
    phase: string;
    startTime: number;
    endTime?: number;
    duration?: number;
}

interface BootPerformance {
    metrics: Map<string, BootMetric>;
}

// Global singleton for boot performance tracking
const bootPerf: BootPerformance = {
    metrics: new Map(),
};

/**
 * Get current performance time (consistent with session logger)
 */
function now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * Mark the start of a boot phase
 */
export function markPhaseStart(phase: string): void {
    bootPerf.metrics.set(phase, {
        phase,
        startTime: now(),
    });
    
    // Log to session logger (performanceTime is added automatically)
    logger.info('boot', `▶ ${phase} started`, {
        meta: { phase }
    });
}

/**
 * Mark the end of a boot phase
 */
export function markPhaseEnd(phase: string): void {
    const metric = bootPerf.metrics.get(phase);
    
    if (metric) {
        metric.endTime = now();
        metric.duration = metric.endTime - metric.startTime;
        
        // Log to session logger
        logger.info('boot', `✓ ${phase} completed in ${metric.duration.toFixed(0)}ms`, {
            meta: { phase, durationMs: Math.round(metric.duration) }
        });
    }
}

/**
 * Mark a single event (instant, no duration)
 */
export function markEvent(event: string): void {
    bootPerf.metrics.set(event, {
        phase: event,
        startTime: now(),
        endTime: now(),
        duration: 0,
    });
    
    // Log to session logger
    logger.info('boot', `● ${event}`, {
        meta: { event }
    });
}

/**
 * Log status information (not a timing event, just info)
 */
export function logStatus(label: string, data: Record<string, unknown>): void {
    // Log to session logger
    logger.info('boot', `📋 ${label}`, {
        meta: data
    });
}

/**
 * Log boot summary to session logger (called automatically after auth resolves)
 */
export function printBootSummary(): void {
    const sortedMetrics = Array.from(bootPerf.metrics.values())
        .sort((a, b) => a.startTime - b.startTime);
    
    // Build summary data (durations only - timing handled by session logger)
    const metricsData: Record<string, string> = {};
    
    for (const metric of sortedMetrics) {
        if (metric.duration !== undefined && metric.duration > 0) {
            metricsData[metric.phase] = `${Math.round(metric.duration)}ms`;
        } else {
            metricsData[metric.phase] = 'instant';
        }
    }
    
    // Log to session logger
    logger.info('boot', '📊 Performance Summary', { meta: metricsData });
}

/**
 * Get all metrics (for debugging/display)
 */
export function getBootMetrics(): BootMetric[] {
    return Array.from(bootPerf.metrics.values());
}

/**
 * Get total boot time (from first to last metric)
 */
export function getTotalBootTime(): number {
    const metrics = Array.from(bootPerf.metrics.values());
    if (metrics.length === 0) return 0;
    
    const first = Math.min(...metrics.map(m => m.startTime));
    const last = Math.max(...metrics.map(m => m.endTime || m.startTime));
    return last - first;
}

/**
 * Log browser navigation timing metrics.
 * Shows what happened during the 0ms to "Bundle Loaded" gap.
 * Call from console: logNavigationTiming()
 */
export function logNavigationTiming(): void {
    if (typeof window === 'undefined' || !window.performance) {
        console.log('[Boot] Navigation timing not available');
        return;
    }
    
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (entries.length === 0) {
        console.log('[Boot] No navigation timing entries');
        return;
    }
    
    const nav = entries[0];
    
    console.group('[Boot] 🌐 Navigation Timing (0ms to Bundle Load)');
    console.log(`DNS Lookup:       ${Math.round(nav.domainLookupEnd - nav.domainLookupStart)}ms`);
    console.log(`TCP Connection:   ${Math.round(nav.connectEnd - nav.connectStart)}ms`);
    console.log(`Request:          ${Math.round(nav.responseStart - nav.requestStart)}ms`);
    console.log(`Response:         ${Math.round(nav.responseEnd - nav.responseStart)}ms`);
    console.log(`DOM Interactive:  ${Math.round(nav.domInteractive)}ms`);
    console.log(`DOM Complete:     ${Math.round(nav.domComplete)}ms`);
    console.log(`Bundle Loaded:    ${Math.round(bundleLoadedAt)}ms (first JS executed)`);
    console.groupEnd();
    
    // Also log to session logger
    logger.info('boot', '🌐 Navigation Timing', {
        meta: {
            dnsMs: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
            tcpMs: Math.round(nav.connectEnd - nav.connectStart),
            requestMs: Math.round(nav.responseStart - nav.requestStart),
            responseMs: Math.round(nav.responseEnd - nav.responseStart),
            domInteractiveMs: Math.round(nav.domInteractive),
            domCompleteMs: Math.round(nav.domComplete),
            bundleLoadedMs: Math.round(bundleLoadedAt),
        }
    });
}

/**
 * Log resource timing for all loaded assets.
 * Shows JS, CSS, fonts loaded during boot with cache vs network info.
 * Call from console: logResourceTiming()
 */
export function logResourceTiming(filter?: 'js' | 'css' | 'all'): void {
    if (typeof window === 'undefined' || !window.performance) {
        console.log('[Boot] Resource timing not available');
        return;
    }
    
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    // Filter by type
    const filtered = entries.filter(e => {
        if (filter === 'js') return e.name.endsWith('.js');
        if (filter === 'css') return e.name.endsWith('.css');
        return true;
    });
    
    // Sort by start time
    const sorted = filtered.sort((a, b) => a.startTime - b.startTime);
    
    console.group(`[Boot] 📦 Resource Timing (${sorted.length} resources${filter ? `, filter: ${filter}` : ''})`);
    
    // Summary stats
    const jsResources = sorted.filter(r => r.name.endsWith('.js'));
    const cssResources = sorted.filter(r => r.name.endsWith('.css'));
    const totalSize = sorted.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const cachedCount = sorted.filter(r => r.transferSize === 0).length;
    
    console.log(`JS bundles: ${jsResources.length}, CSS: ${cssResources.length}`);
    console.log(`Total transfer: ${Math.round(totalSize / 1024)}KB, Cached: ${cachedCount}/${sorted.length}`);
    console.log('');
    
    // Show resources
    console.log('Start    Duration  Size     Type    Source    Name');
    console.log('─'.repeat(80));
    
    for (const entry of sorted) {
        const start = Math.round(entry.startTime).toString().padStart(5);
        const duration = Math.round(entry.duration).toString().padStart(5);
        const size = entry.transferSize 
            ? `${Math.round(entry.transferSize / 1024)}KB`.padStart(7)
            : ' cached'.padStart(7);
        const type = entry.initiatorType.padEnd(7);
        
        // Determine source (SW cache, browser cache, or network)
        let source = 'network';
        if (entry.transferSize === 0 && entry.decodedBodySize > 0) {
            source = 'sw-cache'; // Service worker cache
        } else if (entry.transferSize === 0 && entry.decodedBodySize === 0) {
            source = 'memory'; // Memory cache
        }
        source = source.padEnd(9);
        
        // Shorten name for display
        const name = entry.name.replace(window.location.origin, '').substring(0, 50);
        
        console.log(`${start}ms  ${duration}ms  ${size}  ${type}  ${source}  ${name}`);
    }
    
    console.groupEnd();
    
    // Also log summary to session logger
    logger.info('boot', '📦 Resource Timing Summary', {
        meta: {
            totalResources: sorted.length,
            jsCount: jsResources.length,
            cssCount: cssResources.length,
            totalTransferKB: Math.round(totalSize / 1024),
            cachedCount,
            networkCount: sorted.length - cachedCount,
        }
    });
}

/**
 * Print a comprehensive performance summary to the console.
 * Call from browser console: printPerformanceLogs()
 * 
 * Shows:
 * - Page load timeline (DNS → TCP → TTFB → Download → DOM → JS)
 * - Resource loading summary (JS/CSS files, sizes, cache status)
 * - Boot phases timeline with visual indicators
 */
export function printPerformanceLogs(): void {
    if (typeof window === 'undefined') {
        console.log('[Boot] Not available in SSR');
        return;
    }
    
    const navStats = getNavigationStats();
    const resourceStats = getResourceStats();
    const metrics = Array.from(bootPerf.metrics.values()).sort((a, b) => a.startTime - b.startTime);
    
    console.log('');
    console.log('%c╔══════════════════════════════════════════════════════════════╗', 'color: #4CAF50; font-weight: bold');
    console.log('%c║                    APP LOAD PERFORMANCE                       ║', 'color: #4CAF50; font-weight: bold');
    console.log('%c╚══════════════════════════════════════════════════════════════╝', 'color: #4CAF50; font-weight: bold');
    console.log('');
    
    // Section 1: Page Load Timeline
    console.log('%c┌─ 🌐 PAGE LOAD TIMELINE ─────────────────────────────────────┐', 'color: #2196F3');
    if (navStats) {
        console.log(`│  DNS Lookup:      ${navStats.dnsMs.toString().padStart(4)}ms`);
        console.log(`│  TCP Connection:  ${navStats.tcpMs.toString().padStart(4)}ms`);
        console.log(`│  TTFB (Server):   ${navStats.ttfbMs.toString().padStart(4)}ms`);
        console.log(`│  Download HTML:   ${navStats.downloadMs.toString().padStart(4)}ms`);
        console.log(`│  DOM Ready:       ${navStats.domReadyMs.toString().padStart(4)}ms`);
        console.log(`│  JS Execution:    ${navStats.bundleStartMs.toString().padStart(4)}ms  ← First code runs`);
    } else {
        console.log('│  Navigation timing not available');
    }
    console.log('%c└─────────────────────────────────────────────────────────────┘', 'color: #2196F3');
    console.log('');
    
    // Section 2: Resource Loading
    console.log('%c┌─ 📦 RESOURCE LOADING ──────────────────────────────────────┐', 'color: #FF9800');
    if (resourceStats) {
        const jsCacheText = resourceStats.jsCached > 0 ? ` (${resourceStats.jsCached} cached)` : ' (none cached)';
        const cssCacheText = resourceStats.cssCached > 0 ? ` (${resourceStats.cssCached} cached)` : ' (none cached)';
        console.log(`│  JavaScript:  ${resourceStats.jsCount} files, ${resourceStats.jsKB}KB${jsCacheText}`);
        console.log(`│              ${resourceStats.jsLoadTime}`);
        console.log(`│  CSS:        ${resourceStats.cssCount} files, ${resourceStats.cssKB}KB${cssCacheText}`);
        console.log(`│              ${resourceStats.cssLoadTime}`);
    } else {
        console.log('│  Resource timing not available');
    }
    console.log('%c└─────────────────────────────────────────────────────────────┘', 'color: #FF9800');
    console.log('');
    
    // Section 3: Boot Phases Timeline (times are absolute from page load, i.e. performance.now())
    console.log('%c┌─ ⚡ BOOT PHASES TIMELINE (from page load) ─────────────────┐', 'color: #9C27B0');
    if (metrics.length > 0) {
        for (const metric of metrics) {
            // Use absolute time from page load (performance.now based)
            const absoluteTime = Math.round(metric.startTime);
            const timeStr = `${absoluteTime}ms`.padStart(6);
            
            let icon = '●';
            let durationStr = '';
            
            if (metric.duration && metric.duration > 0) {
                icon = '▶';
                durationStr = ` (${Math.round(metric.duration)}ms)`;
            }
            
            // Highlight important events
            let style = '';
            if (metric.phase.includes('Content Shown')) {
                style = 'color: #4CAF50; font-weight: bold';
            } else if (metric.phase.includes('Preflight') || metric.phase.includes('Validation')) {
                style = 'color: #FF9800';
            }
            
            if (style) {
                console.log(`│  %c${timeStr}  ${icon} ${metric.phase}${durationStr}`, style);
            } else {
                console.log(`│  ${timeStr}  ${icon} ${metric.phase}${durationStr}`);
            }
        }
    } else {
        console.log('│  No boot metrics recorded');
    }
    console.log('%c└─────────────────────────────────────────────────────────────┘', 'color: #9C27B0');
    console.log('');
    
    // Summary line
    if (metrics.length > 0) {
        const firstContent = metrics.find(m => m.phase.includes('Content Shown'));
        if (firstContent) {
            const timeToContent = Math.round(firstContent.startTime);
            console.log(`%c✨ Time to first content: ${timeToContent}ms`, 'color: #4CAF50; font-size: 14px; font-weight: bold');
        }
    }
    console.log('');
}

// Expose to window for console access
if (typeof window !== 'undefined') {
    const win = window as unknown as Record<string, unknown>;
    win.logNavigationTiming = logNavigationTiming;
    win.logResourceTiming = logResourceTiming;
    win.printPerformanceLogs = printPerformanceLogs;
}

// Export constants for phase names
export const BOOT_PHASES = {
    // Very early (JS bundle loading)
    BUNDLE_LOADED: 'Bundle Loaded',
    
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

/**
 * Log bundle loaded event (called automatically when this module loads)
 * This is lightweight - no performance calculations here.
 */
function logBundleLoaded(): void {
    logger.info('boot', `● ${BOOT_PHASES.BUNDLE_LOADED}`);
}

// Log bundle loaded immediately when this module first executes
// This is the earliest point we can log - when JS first runs
logBundleLoaded();

// ============================================================================
// ON-DEMAND PERFORMANCE DETAILS (only calculated when reporting performance issues)
// ============================================================================

interface ResourceStats {
    jsCount: number; 
    cssCount: number; 
    jsKB: number; 
    cssKB: number;
    jsCached: number;
    cssCached: number;
    jsLoadTime: string;
    cssLoadTime: string;
}

interface NavigationStats {
    dnsMs: number;
    tcpMs: number;
    ttfbMs: number;
    downloadMs: number;
    domReadyMs: number;
    bundleStartMs: number;
}

/**
 * Get aggregated resource loading stats (called on-demand)
 */
function getResourceStats(): ResourceStats | null {
    if (typeof window === 'undefined' || !window.performance) {
        return null;
    }
    
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    if (entries.length === 0) return null;
    
    const jsResources = entries.filter(e => e.name.endsWith('.js'));
    const cssResources = entries.filter(e => e.name.endsWith('.css'));
    
    const jsKB = Math.round(jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024);
    const cssKB = Math.round(cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024);
    const jsCached = jsResources.filter(r => r.transferSize === 0 && r.decodedBodySize > 0).length;
    const cssCached = cssResources.filter(r => r.transferSize === 0 && r.decodedBodySize > 0).length;
    
    // JS timing
    const jsLoadTime = jsResources.length > 0
        ? (() => {
            const jsFirst = Math.round(Math.min(...jsResources.map(e => e.startTime)));
            const jsLast = Math.round(Math.max(...jsResources.map(e => e.responseEnd)));
            return `${jsFirst}→${jsLast}ms`;
        })()
        : 'N/A';
    
    // CSS timing
    const cssLoadTime = cssResources.length > 0
        ? (() => {
            const cssFirst = Math.round(Math.min(...cssResources.map(e => e.startTime)));
            const cssLast = Math.round(Math.max(...cssResources.map(e => e.responseEnd)));
            return `${cssFirst}→${cssLast}ms`;
        })()
        : 'N/A';
    
    return {
        jsCount: jsResources.length,
        cssCount: cssResources.length,
        jsKB,
        cssKB,
        jsCached,
        cssCached,
        jsLoadTime,
        cssLoadTime,
    };
}

/**
 * Get navigation timing metrics (called on-demand)
 */
function getNavigationStats(): NavigationStats | null {
    if (typeof window === 'undefined' || !window.performance) {
        return null;
    }
    
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (entries.length === 0) return null;
    
    const nav = entries[0];
    
    return {
        dnsMs: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
        tcpMs: Math.round(nav.connectEnd - nav.connectStart),
        ttfbMs: Math.round(nav.responseStart - nav.requestStart),
        downloadMs: Math.round(nav.responseEnd - nav.responseStart),
        domReadyMs: Math.round(nav.domInteractive),
        bundleStartMs: Math.round(bundleLoadedAt),
    };
}

/**
 * Generate a formatted performance summary string.
 * Call this when submitting a performance bug report.
 * Returns a string to include directly in the report (not added to session logs).
 */
export function getPerformanceSummary(): string {
    const lines: string[] = [];
    
    lines.push('=== PERFORMANCE SUMMARY ===');
    lines.push('');
    
    // Navigation timing
    const navStats = getNavigationStats();
    if (navStats) {
        lines.push('🌐 Page Load Timeline:');
        lines.push(`  DNS: ${navStats.dnsMs}ms → TCP: ${navStats.tcpMs}ms → TTFB: ${navStats.ttfbMs}ms → Download: ${navStats.downloadMs}ms`);
        lines.push(`  DOM Ready: ${navStats.domReadyMs}ms → JS Start: ${navStats.bundleStartMs}ms`);
        lines.push('');
    }
    
    // Resource stats
    const resourceStats = getResourceStats();
    if (resourceStats) {
        const jsCacheInfo = resourceStats.jsCached > 0 ? ` (${resourceStats.jsCached} cached)` : '';
        const cssCacheInfo = resourceStats.cssCached > 0 ? ` (${resourceStats.cssCached} cached)` : '';
        lines.push('📦 Resources:');
        lines.push(`  JS: ${resourceStats.jsCount} files, ${resourceStats.jsKB}KB${jsCacheInfo}, ${resourceStats.jsLoadTime}`);
        lines.push(`  CSS: ${resourceStats.cssCount} files, ${resourceStats.cssKB}KB${cssCacheInfo}, ${resourceStats.cssLoadTime}`);
        lines.push('');
    }
    
    // Boot phases timeline (times are absolute from page load)
    const metrics = Array.from(bootPerf.metrics.values()).sort((a, b) => a.startTime - b.startTime);
    if (metrics.length > 0) {
        lines.push('⚡ Boot Timeline (from page load):');
        for (const metric of metrics) {
            // Use absolute time from page load (performance.now based)
            const absoluteTime = Math.round(metric.startTime);
            const icon = (metric.duration && metric.duration > 0) ? '▶' : '●';
            const durationStr = (metric.duration && metric.duration > 0) ? ` (${Math.round(metric.duration)}ms)` : '';
            lines.push(`  ${absoluteTime}ms ${icon} ${metric.phase}${durationStr}`);
        }
        lines.push('');
        
        // Time to first content
        const firstContent = metrics.find(m => m.phase.includes('Content Shown'));
        if (firstContent) {
            const timeToContent = Math.round(firstContent.startTime);
            lines.push(`✨ Time to first content: ${timeToContent}ms`);
        }
    }
    
    lines.push('===========================');
    
    return lines.join('\n');
}
