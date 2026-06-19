/**
 * Zustand Store Factory
 * 
 * Unified factory for creating Zustand stores with automatic registration
 * and enforced persistence patterns.
 * 
 * @example
 * // PERSISTED store (default) - persistOptions REQUIRED
 * const useSettingsStore = createStore<SettingsState>({
 *   key: 'settings-storage',
 *   label: 'Settings',
 *   creator: (set) => ({ settings: defaultSettings, ... }),
 *   persistOptions: { partialize: (state) => ({ settings: state.settings }) },
 * });
 * 
 * @example
 * // IN-MEMORY store (explicit opt-out) - inMemoryOnly REQUIRED
 * const useSessionLogsStore = createStore<SessionLogsState>({
 *   key: 'session-logs',
 *   label: 'Session Logs',
 *   inMemoryOnly: true,
 *   creator: (set, get) => ({ logs: [], ... }),
 * });
 */

import { create, type StoreApi } from 'zustand';
import { createJSONStorage, persist, subscribeWithSelector, type PersistOptions, type StateStorage } from 'zustand/middleware';
import type { PersistedStoreConfig, InMemoryStoreConfig } from './types';
import { registerStore } from './registry';

/**
 * Quota-safe localStorage wrapper for zustand's persist middleware.
 *
 * zustand's default storage writes to localStorage with no error handling, so a
 * near-full quota makes `setItem` throw an uncaught QuotaExceededError on routine
 * writes (e.g. route-storage on every navigation). This wrapper swallows write
 * failures: the store keeps working in memory and degrades gracefully instead of
 * crashing the writer that happened to trip the full quota.
 *
 * Returns `undefined` on the server so callers fall back to zustand's no-op SSR
 * path (never construct a persistStorage around an unavailable backend).
 */
function getSafeStorage(): StateStorage | undefined {
    if (typeof window === 'undefined') return undefined;
    return {
        getItem: (name) => window.localStorage.getItem(name),
        setItem: (name, value) => {
            try {
                window.localStorage.setItem(name, value);
            } catch (error) {
                // localStorage full (or unavailable) — drop the write, don't throw.
                console.warn(`[store] Failed to persist "${name}" to localStorage (quota likely exceeded). Continuing in memory.`, error);
            }
        },
        removeItem: (name) => window.localStorage.removeItem(name),
    };
}

// ============================================================================
// Store Return Types
// ============================================================================

/**
 * Subscribe with selector function signature
 */
type SubscribeWithSelector<T> = {
    subscribe: {
        (listener: (state: T, prevState: T) => void): () => void;
        <U>(
            selector: (state: T) => U,
            listener: (selectedState: U, previousSelectedState: U) => void,
            options?: {
                equalityFn?: (a: U, b: U) => boolean;
                fireImmediately?: boolean;
            }
        ): () => void;
    };
};

/**
 * The base store hook type (callable with optional selector)
 */
type BaseStoreHook<T> = {
    (): T;
    <U>(selector: (state: T) => U): U;
    getState: () => T;
    setState: StoreApi<T>['setState'];
    getInitialState: () => T;
};

/**
 * Store hook with subscribeWithSelector middleware
 */
export type StoreHookWithSelector<T> = BaseStoreHook<T> & SubscribeWithSelector<T>;

/**
 * Store hook without subscribeWithSelector middleware (basic subscribe)
 */
export type StoreHook<T> = BaseStoreHook<T> & {
    subscribe: (listener: (state: T, prevState: T) => void) => () => void;
};

// ============================================================================
// Factory Overloads
// ============================================================================

/**
 * Create a PERSISTED store (default behavior)
 * 
 * - Automatically persists to localStorage
 * - Applies subscribeWithSelector middleware by default
 * - Registers to central store registry
 */
export function createStore<T>(config: PersistedStoreConfig<T>): StoreHookWithSelector<T>;

/**
 * Create an IN-MEMORY store (explicit opt-out)
 * 
 * - No localStorage persistence
 * - Registers to central store registry
 */
export function createStore<T>(config: InMemoryStoreConfig<T>): StoreHook<T>;

/**
 * Implementation
 */
export function createStore<T>(
    config: PersistedStoreConfig<T> | InMemoryStoreConfig<T>
): StoreHookWithSelector<T> | StoreHook<T> {
    const { key, label, creator } = config;
    
    // Register store metadata in the registry (store instance registered after creation)
    const isPersisted = !('inMemoryOnly' in config && config.inMemoryOnly);
    
    // In-memory store (no persistence)
    if ('inMemoryOnly' in config && config.inMemoryOnly) {
        // Apply subscribeWithSelector if explicitly requested
        if (config.withSelector) {
            const store = create<T>()(subscribeWithSelector(creator)) as unknown as StoreHookWithSelector<T>;
            registerStore({ key, label, isPersisted }, store);
            return store;
        }
        const store = create<T>()(creator) as unknown as StoreHook<T>;
        registerStore({ key, label, isPersisted }, store);
        return store;
    }
    
    // Persisted store (default)
    const persistedConfig = config as PersistedStoreConfig<T>;
    const { persistOptions, withSelector = true } = persistedConfig;
    
    // Build persist options with the key as name.
    // On the client, default to a quota-safe localStorage wrapper so a near-full
    // quota degrades gracefully instead of throwing an uncaught QuotaExceededError
    // on write. On the server we leave `storage` unset so zustand's built-in no-op
    // SSR path applies. Callers can still override `storage` explicitly.
    const safeStorage = getSafeStorage();
    const fullPersistOptions: PersistOptions<T, Partial<T>> = {
        ...(safeStorage ? { storage: createJSONStorage(() => safeStorage) } : {}),
        ...persistOptions,
        name: key,
    };
    
    // Apply middlewares: subscribeWithSelector wraps persist
    if (withSelector) {
        const store = create<T>()(
            subscribeWithSelector(
                persist(creator, fullPersistOptions)
            )
        ) as unknown as StoreHookWithSelector<T>;
        registerStore({ key, label, isPersisted }, store);
        return store;
    }
    
    // Just persist without subscribeWithSelector
    const store = create<T>()(persist(creator, fullPersistOptions)) as unknown as StoreHook<T>;
    registerStore({ key, label, isPersisted }, store);
    return store;
}
