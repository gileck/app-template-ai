/**
 * Zustand Store Factory & Registry
 * 
 * This module provides a unified factory for creating Zustand stores
 * with automatic registration, persistence defaults, and cache management.
 * 
 * @example
 * ```typescript
 * import { createStore } from '@/client/stores';
 * 
 * // PERSISTED store (default) - persistOptions REQUIRED
 * const useMyStore = createStore<MyState>({
 *   key: 'my-storage',
 *   label: 'My Store',
 *   creator: (set) => ({ ... }),
 *   persistOptions: { partialize: (state) => ({ ... }) },
 * });
 * 
 * // IN-MEMORY store (explicit opt-out) - inMemoryOnly REQUIRED
 * const useSessionStore = createStore<SessionState>({
 *   key: 'session',
 *   label: 'Session',
 *   inMemoryOnly: true,
 *   creator: (set) => ({ ... }),
 * });
 * ```
 * 
 * See docs/zustand-stores.md for comprehensive guidelines.
 */

// Factory
export { createStore } from './createStore';

// Registry utilities
export {
    getAllStores,
    getPersistedStores,
    getInMemoryStores,
    getTotalCacheSize,
    getCacheSizeBreakdown,
    clearAllPersistedStores,
    clearPersistedStore,
    printAllStores,
} from './registry';

// Types
export type {
    StoreInfo,
    CacheSize,
    CacheSizeInfo,
    PersistedStoreConfig,
    InMemoryStoreConfig,
    StoreConfig,
} from './types';

// ============================================================================
// Re-exports from features (backwards compatibility)
// ============================================================================

/**
 * @deprecated - Import from @/client/features instead
 * 
 * These re-exports are for backwards compatibility.
 * New code should import directly from:
 * - @/client/features/auth
 * - @/client/features/settings
 * - @/client/features/router
 */
export * from '@/client/features/auth';
export * from '@/client/features/settings';
export * from '@/client/features/router';
