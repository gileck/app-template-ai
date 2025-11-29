/**
 * Centralized React Query default options
 * 
 * All cache configuration lives here - hooks just use these defaults.
 * Settings (like staleWhileRevalidate) are read from Zustand store.
 */

import { useSettingsStore } from '@/client/features/settings';

// ============================================================================
// Cache Duration Constants (single source of truth)
// ============================================================================

export const CACHE_TIMES = {
    /** How long data is considered "fresh" (won't refetch) */
    STALE_TIME: 30 * 1000, // 30 seconds

    /** How long to keep data in memory/cache after component unmounts */
    GC_TIME: 30 * 60 * 1000, // 30 minutes

    /** Maximum age for stale data to be served while revalidating */
    MAX_STALE_AGE: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// ============================================================================
// Default Query Options Hook
// ============================================================================

/**
 * Returns default React Query options based on user settings.
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

    return {
        // If SWR enabled: data is fresh for STALE_TIME, then refetch in background
        // If SWR disabled: always refetch on mount
        staleTime: staleWhileRevalidate ? CACHE_TIMES.STALE_TIME : 0,
        gcTime: CACHE_TIMES.GC_TIME,
    };
}

// ============================================================================
// Default Mutation Options (for reference, mutations don't need caching)
// ============================================================================

export const MUTATION_DEFAULTS = {
    // Mutations don't retry by default (handled by offline queue)
    retry: 0,
} as const;

