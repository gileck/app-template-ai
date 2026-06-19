import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { logger } from '@/client/features/template/session-logs';
import { formatBytes } from '@/client/lib/utils';
import { defaultSettings } from '@/client/features/template/settings';

const CACHE_KEY = 'react-query-cache';
const CACHE_BUSTER = 'v2'; // Increment to invalidate all cached data (v2: excluded reports from cache)

/**
 * Canonical localStorage key for the persisted React Query blob.
 * Exported as the single source of truth so the cache monitor, the trim helper,
 * and the Settings UI all reference the same key instead of hardcoding it.
 */
export const PERSISTED_CACHE_KEY = `${CACHE_KEY}-${CACHE_BUSTER}`;

/**
 * Storage type for React Query persistence
 * - 'localStorage': Fast, but limited to ~5MB
 * - 'indexedDB': Larger capacity, but can be very slow on some systems
 */
export type StorageType = 'localStorage' | 'indexedDB';

/**
 * Get cache persist max age from user settings.
 * Falls back to default (7 days) if settings not available.
 */
function getMaxAge(): number {
    if (typeof window === 'undefined') {
        return defaultSettings.cachePersistDays * 24 * 60 * 60 * 1000;
    }
    
    try {
        const stored = localStorage.getItem('settings-storage');
        if (stored) {
            const parsed = JSON.parse(stored);
            const days = parsed?.state?.settings?.cachePersistDays;
            if (typeof days === 'number' && days > 0) {
                return days * 24 * 60 * 60 * 1000;
            }
        }
    } catch {
        // Ignore parse errors
    }
    return defaultSettings.cachePersistDays * 24 * 60 * 60 * 1000;
}

/**
 * Calculate approximate size of an object in bytes
 */
function getObjectSize(obj: unknown): number {
    try {
        const str = JSON.stringify(obj);
        return new Blob([str]).size;
    } catch {
        return 0;
    }
}

/**
 * Thresholds for logging cache operations as warnings
 * Only log if duration > 500ms OR size > 1MB
 */
const SLOW_DURATION_THRESHOLD = 500; // ms
const LARGE_SIZE_THRESHOLD = 1024 * 1024; // 1MB

/**
 * Maximum size of the React Query persist blob written to localStorage,
 * measured in UTF-16 code units (i.e. `string.length`). This matches how
 * browsers account the localStorage quota, so the check is exact for the quota
 * even though it is an under-estimate of the UTF-8 byte footprint for multibyte
 * content. localStorage is capped at ~5MB total across ALL keys, so we budget
 * the cache below that to leave headroom for zustand stores and to avoid filling
 * the quota (which makes the next setItem from any writer throw
 * QuotaExceededError). When exceeded, we skip the write rather than persist a
 * blob that crowds out every other store.
 */
const MAX_PERSIST_BYTES = 4 * 1024 * 1024; // 4M UTF-16 code units

/**
 * Check if cache operation should be logged (only if slow or large)
 */
function shouldLogCacheOperation(duration: number, size: number): boolean {
    return duration > SLOW_DURATION_THRESHOLD || size > LARGE_SIZE_THRESHOLD;
}

/**
 * Default throttle window for persist writes.
 *
 * react-query-persist-client@5 persists SYNCHRONOUSLY on every query/mutation
 * cache event (added | removed | updated) — there is no built-in throttle in v5
 * (the old `throttleTime` persistOption was removed). Opening a page emits a
 * burst of such events (each query fires on fetch-start AND fetch-success, each
 * optimistic mutation fires several), so the full multi-hundred-KB cache gets
 * re-serialized and written many times back-to-back, janking the main thread.
 *
 * Wrapping `persistClient` with a trailing-edge throttle coalesces that burst
 * into a single write. We keep the LATEST client snapshot and write it once the
 * window elapses, so no state is lost — only intermediate writes are skipped.
 */
const PERSIST_THROTTLE_MS = 1000;

/**
 * Wrap a Persister so `persistClient` is throttled (trailing edge): a burst of
 * N calls within the window results in a single write of the most recent client.
 * `restoreClient` is passed through untouched (must be immediate on boot).
 * `removeClient` is immediate AND cancels any pending throttled write, so we
 * never re-persist a cache we were just asked to clear.
 */
function throttlePersister(persister: Persister, throttleMs: number = PERSIST_THROTTLE_MS): Persister {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pendingClient: PersistedClient | null = null;

    const flush = () => {
        timer = null;
        const client = pendingClient;
        pendingClient = null;
        if (client) {
            // Fire-and-forget: the underlying persistClient swallows its own errors.
            void persister.persistClient(client);
        }
    };

    // Flush any pending write immediately (used on tab hide/unload so the most
    // recent cache snapshot survives a close that happens inside the throttle
    // window). Safe to call when nothing is pending.
    const flushNow = () => {
        if (timer !== null) {
            clearTimeout(timer);
            flush();
        }
    };

    if (typeof window !== 'undefined') {
        // pagehide covers tab close / bfcache; visibilitychange→hidden covers
        // backgrounding (the only reliable "about to leave" signal on mobile).
        window.addEventListener('pagehide', flushNow);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') flushNow();
        });
    }

    return {
        persistClient: async (client: PersistedClient) => {
            // Always remember the latest snapshot; schedule a trailing write.
            pendingClient = client;
            if (timer === null) {
                timer = setTimeout(flush, throttleMs);
            }
        },
        restoreClient: persister.restoreClient,
        removeClient: async () => {
            // Cancel any pending write so a cleared cache stays cleared.
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
            pendingClient = null;
            await persister.removeClient();
        },
    };
}

/**
 * Create a localStorage persister for React Query
 * Fast but limited to ~5MB
 */
export function createLocalStoragePersister(): Persister {
    const key = PERSISTED_CACHE_KEY;

    return throttlePersister({
        persistClient: async (client: PersistedClient) => {
            try {
                const start = performance.now();
                const data = JSON.stringify(client);
                // Single serialization pass on the common path: use the string
                // length (UTF-16 code units) as a fast size estimate. The exact
                // UTF-8 byte size (via Blob) is only computed inside the rare
                // slow/large logging branch below, never on every write.
                const size = data.length;

                // Cap the persist blob so the React Query cache can never consume
                // the whole localStorage quota. If it would, skip this write (the
                // last successfully persisted, smaller blob stays in place) and warn.
                if (size > MAX_PERSIST_BYTES) {
                    const queryCount = client.clientState?.queries?.length || 0;
                    logger.warn('cache', `React Query cache too large to persist, skipping write (localStorage)`, {
                        meta: { size, sizeFormatted: formatBytes(size), limit: MAX_PERSIST_BYTES, limitFormatted: formatBytes(MAX_PERSIST_BYTES), queryCount }
                    });
                    return;
                }

                localStorage.setItem(key, data);
                const duration = Math.round(performance.now() - start);

                // Only log if slow or large. The exact UTF-8 byte size is computed
                // here (the rare path) instead of on every write.
                if (shouldLogCacheOperation(duration, size)) {
                    const byteSize = new Blob([data]).size;
                    const queryCount = client.clientState?.queries?.length || 0;
                    logger.warn('cache', `React Query cache persisted slowly (localStorage)`, {
                        meta: { duration, size: byteSize, sizeFormatted: formatBytes(byteSize), queryCount }
                    });
                }
            } catch (error) {
                logger.error('cache', `Failed to persist React Query cache (localStorage)`, {
                    meta: { error: error instanceof Error ? error.message : String(error) }
                });
            }
        },
        restoreClient: async (): Promise<PersistedClient | undefined> => {
            try {
                const start = performance.now();
                const data = localStorage.getItem(key);
                const duration = Math.round(performance.now() - start);

                if (!data) {
                    return undefined;
                }

                const client = JSON.parse(data) as PersistedClient;
                const size = data.length;
                
                // Only log if slow or large
                if (shouldLogCacheOperation(duration, size)) {
                    const queryCount = client.clientState?.queries?.length || 0;
                    logger.warn('cache', `React Query cache restored slowly (localStorage)`, {
                        meta: { duration, size, sizeFormatted: formatBytes(size), queryCount }
                    });
                }

                // Check if cache is too old
                const maxAge = getMaxAge();
                if (client.timestamp && Date.now() - client.timestamp > maxAge) {
                    logger.warn('cache', `React Query cache expired, clearing (localStorage)`, {
                        meta: { cacheAge: Date.now() - client.timestamp, maxAge }
                    });
                    localStorage.removeItem(key);
                    return undefined;
                }

                return client;
            } catch (error) {
                logger.error('cache', `Failed to restore React Query cache (localStorage)`, {
                    meta: { error: error instanceof Error ? error.message : String(error) }
                });
                return undefined;
            }
        },
        removeClient: async () => {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                logger.error('cache', `Failed to remove React Query cache (localStorage)`, {
                    meta: { error: error instanceof Error ? error.message : String(error) }
                });
            }
        },
    });
}

/**
 * Create an IndexedDB persister for React Query
 * Uses idb-keyval for simple key-value storage
 * Note: Can be very slow on some systems
 */
export function createIDBPersister(): Persister {
    return throttlePersister({
        persistClient: async (client: PersistedClient) => {
            try {
                const start = performance.now();
                await set(`${CACHE_KEY}-${CACHE_BUSTER}`, client);
                const duration = Math.round(performance.now() - start);
                const size = getObjectSize(client);
                
                // Only log if slow or large
                if (shouldLogCacheOperation(duration, size)) {
                    const queryCount = client.clientState?.queries?.length || 0;
                    logger.warn('cache', `React Query cache persisted slowly (IndexedDB)`, {
                        meta: { duration, size, sizeFormatted: formatBytes(size), queryCount }
                    });
                }
            } catch (error) {
                logger.error('cache', `Failed to persist React Query cache (IndexedDB)`, {
                    meta: { error: error instanceof Error ? error.message : String(error) }
                });
            }
        },
        restoreClient: async (): Promise<PersistedClient | undefined> => {
            try {
                const start = performance.now();
                const client = await get<PersistedClient>(`${CACHE_KEY}-${CACHE_BUSTER}`);
                const duration = Math.round(performance.now() - start);

                if (!client) {
                    return undefined;
                }

                const size = getObjectSize(client);
                
                // Only log if slow or large
                if (shouldLogCacheOperation(duration, size)) {
                    const queryCount = client.clientState?.queries?.length || 0;
                    logger.warn('cache', `React Query cache restored slowly (IndexedDB)`, {
                        meta: { duration, size, sizeFormatted: formatBytes(size), queryCount }
                    });
                }

                // Check if cache is too old
                const maxAge = getMaxAge();
                if (client.timestamp && Date.now() - client.timestamp > maxAge) {
                    logger.warn('cache', `React Query cache expired, clearing (IndexedDB)`, {
                        meta: { cacheAge: Date.now() - client.timestamp, maxAge }
                    });
                    await del(`${CACHE_KEY}-${CACHE_BUSTER}`);
                    return undefined;
                }

                return client;
            } catch (error) {
                logger.error('cache', `Failed to restore React Query cache (IndexedDB)`, {
                    meta: { error: error instanceof Error ? error.message : String(error) }
                });
                return undefined;
            }
        },
        removeClient: async () => {
            try {
                await del(`${CACHE_KEY}-${CACHE_BUSTER}`);
            } catch (error) {
                logger.error('cache', `Failed to remove React Query cache (IndexedDB)`, {
                    meta: { error: error instanceof Error ? error.message : String(error) }
                });
            }
        },
    });
}

