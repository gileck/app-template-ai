import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

const CACHE_KEY = 'react-query-cache';
const CACHE_BUSTER = 'v1'; // Increment to invalidate all cached data

/**
 * Maximum age for persisted cache (24 hours)
 * After this, the cache will be discarded and fresh data fetched
 */
const MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * Create an IndexedDB persister for React Query
 * Uses idb-keyval for simple key-value storage
 */
export function createIDBPersister(): Persister {
    return {
        persistClient: async (client: PersistedClient) => {
            try {
                await set(`${CACHE_KEY}-${CACHE_BUSTER}`, client);
            } catch (error) {
                console.error('Failed to persist React Query cache to IndexedDB:', error);
            }
        },
        restoreClient: async (): Promise<PersistedClient | undefined> => {
            try {
                const client = await get<PersistedClient>(`${CACHE_KEY}-${CACHE_BUSTER}`);

                if (!client) {
                    return undefined;
                }

                // Check if cache is too old
                if (client.timestamp && Date.now() - client.timestamp > MAX_AGE) {
                    // Cache expired, remove it
                    await del(`${CACHE_KEY}-${CACHE_BUSTER}`);
                    return undefined;
                }

                return client;
            } catch (error) {
                console.error('Failed to restore React Query cache from IndexedDB:', error);
                return undefined;
            }
        },
        removeClient: async () => {
            try {
                await del(`${CACHE_KEY}-${CACHE_BUSTER}`);
            } catch (error) {
                console.error('Failed to remove React Query cache from IndexedDB:', error);
            }
        },
    };
}

