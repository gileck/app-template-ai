/**
 * React Query Default Options
 * 
 * All cache configuration is centralized in @/client/config.
 * This file provides hooks that apply those defaults to React Query.
 */

import { useSettingsStore } from '@/client/features/settings';
import { QUERY_DEFAULTS, MUTATION_DEFAULTS } from '@/client/config';

// Re-export for convenience (single import)
export { QUERY_DEFAULTS, MUTATION_DEFAULTS } from '@/client/config';

// Legacy alias for backwards compatibility
export const CACHE_TIMES = {
    STALE_TIME: QUERY_DEFAULTS.STALE_TIME,
    GC_TIME: QUERY_DEFAULTS.GC_TIME,
} as const;

/**
 * Returns default React Query options based on user settings.
 * 
 * This is the SINGLE POINT OF CONTROL for React Query caching behavior.
 * 
 * - SWR ON (default): Normal caching - serve cached data immediately, refresh in background
 * - SWR OFF: No caching - always fetch fresh data, never serve stale
 * 
 * Usage in hooks:
 * ```typescript
 * export function useTodos() {
 *     const queryDefaults = useQueryDefaults();
 *     return useQuery({
 *         queryKey: ['todos'],
 *         queryFn: () => fetchTodos(),
 *         ...queryDefaults,
 *     });
 * }
 * ```
 */
export function useQueryDefaults() {
    const staleWhileRevalidate = useSettingsStore((s) => s.settings.staleWhileRevalidate);

    if (staleWhileRevalidate) {
        // SWR ON: Normal caching behavior
        // - Data is "fresh" for STALE_TIME (won't refetch)
        // - After stale, show cached data + refetch in background
        // - Keep in memory for GC_TIME after unmount
        return {
            staleTime: QUERY_DEFAULTS.STALE_TIME,
            gcTime: QUERY_DEFAULTS.GC_TIME,
        };
    }

    // SWR OFF: No caching at all
    // - Always fetch fresh data on mount
    // - Don't keep data in memory after unmount
    // - Effectively disables React Query's cache
    return {
        staleTime: 0,
        gcTime: 0,
    };
}

/**
 * Default options for mutations (no caching needed)
 */
export function useMutationDefaults() {
    return MUTATION_DEFAULTS;
}
