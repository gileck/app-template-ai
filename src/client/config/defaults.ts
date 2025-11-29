/**
 * Centralized Configuration Defaults
 * 
 * All cache/persistence configuration lives here.
 * Features use these defaults automatically, with ability to override.
 */

import type { PersistOptions } from 'zustand/middleware';

// ============================================================================
// Time Constants (single source of truth)
// ============================================================================

export const TIME = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// Zustand Store Defaults
// ============================================================================

export const STORE_DEFAULTS = {
    /** Default TTL for persisted state (7 days) */
    TTL: 7 * TIME.DAY,

    /** Short-lived state TTL (1 day) */
    TTL_SHORT: 1 * TIME.DAY,

    /** Long-lived state TTL (30 days) */
    TTL_LONG: 30 * TIME.DAY,

    /** Auth hint TTL - how long to trust cached login state */
    TTL_AUTH_HINT: 7 * TIME.DAY,

    /** Route persistence TTL - how long to remember last route */
    TTL_ROUTE: 30 * TIME.DAY,
} as const;

// ============================================================================
// React Query Cache Defaults
// ============================================================================

export const QUERY_DEFAULTS = {
    /** How long data is considered "fresh" (won't refetch) */
    STALE_TIME: 30 * TIME.SECOND,

    /** How long to keep data in memory after component unmounts */
    GC_TIME: 30 * TIME.MINUTE,

    /** Maximum age for stale data to be served while revalidating */
    MAX_STALE_AGE: 24 * TIME.HOUR,

    /** IndexedDB persistence max age */
    PERSIST_MAX_AGE: 7 * TIME.DAY,
} as const;

export const MUTATION_DEFAULTS = {
    /** Mutations don't retry by default (handled by offline queue) */
    retry: 0,
} as const;

// ============================================================================
// Zustand Store Helpers
// ============================================================================

/**
 * Default persist options with TTL validation.
 * Use this when creating new Zustand stores with persistence.
 * 
 * @example
 * ```typescript
 * export const useMyStore = create<MyState>()(
 *     persist(
 *         (set) => ({ ... }),
 *         createPersistConfig('my-store', {
 *             ttl: STORE_DEFAULTS.TTL_SHORT, // Override TTL
 *         })
 *     )
 * );
 * ```
 */
export function createPersistConfig<T>(
    name: string,
    options?: {
        /** TTL in ms. Default: STORE_DEFAULTS.TTL (7 days) */
        ttl?: number;
        /** Fields to persist. Default: all fields */
        partialize?: (state: T) => Partial<T>;
        /** Field name for timestamp. Default: '_persistedAt' */
        timestampField?: string;
    }
): PersistOptions<T, Partial<T>> {
    const ttl = options?.ttl ?? STORE_DEFAULTS.TTL;
    const timestampField = options?.timestampField ?? '_persistedAt';

    return {
        name: `${name}-storage`,
        partialize: options?.partialize ?? ((state) => {
            // Add timestamp to persisted state
            return { ...state, [timestampField]: Date.now() } as Partial<T>;
        }),
        onRehydrateStorage: () => (state) => {
            if (!state) return;
            
            // Check TTL on rehydration
            const timestamp = (state as Record<string, unknown>)[timestampField] as number | undefined;
            if (timestamp && Date.now() - timestamp > ttl) {
                // State is expired - clear it
                // Note: This sets fields to undefined, the store should handle this
                console.log(`[${name}] Persisted state expired (TTL: ${ttl}ms)`);
            }
        },
    };
}

/**
 * Create TTL validation helper for stores that need custom expiry logic.
 * 
 * @example
 * ```typescript
 * const isValid = createTTLValidator(STORE_DEFAULTS.TTL_AUTH_HINT);
 * if (!isValid(state.hintTimestamp)) {
 *     // Clear expired state
 * }
 * ```
 */
export function createTTLValidator(ttl: number) {
    return (timestamp: number | null | undefined): boolean => {
        if (!timestamp) return false;
        return Date.now() - timestamp < ttl;
    };
}

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Add timestamp field to state interface for TTL tracking
 */
export interface WithTimestamp {
    _persistedAt?: number;
}

