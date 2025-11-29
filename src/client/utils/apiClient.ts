import { CacheResult } from "@/common/cache/types";
import { createCache } from "@/common/cache";
import { clientCacheProvider } from "./indexedDBCache";
import type { Settings } from "@/client/stores/types";
import { useSettingsStore } from "@/client/stores";
import {
  enqueueOfflinePost,
  generateQueueId,
  flushOfflineQueue,
  shouldFlushNow,
} from '@/client/utils/offlinePostQueue';

const clientCache = createCache(clientCacheProvider)

// Legacy callback support for initialization
let getSettingsRef: (() => Settings) | null = null;

export function initializeApiClient(getSettings: () => Settings) {
  getSettingsRef = getSettings;
  // Try to flush queued POST requests when settings change (e.g., leaving offline mode)
  try {
    const settings = getSettingsRef?.();
    if (shouldFlushNow(settings)) {
      void flushOfflineQueue(() => getSettingsRef?.());
    }
  } catch {
    // ignore
  }
}

/**
 * Get settings from Zustand store (preferred) or fallback to callback
 */
function getSettingsSafe(): Settings | null {
  // Try to get from Zustand store first (preferred)
  try {
    return useSettingsStore.getState().settings;
  } catch {
    // Fallback to legacy callback
    try {
      return getSettingsRef ? getSettingsRef() : null;
    } catch {
      return null;
    }
  }
}

export const apiClient = {
  /**
   * Make a POST request to an API endpoint
   * @param endpoint The API endpoint
   * @param body Request body
   * @param options Additional request options
   * @returns Promise with the typed response
   */
  call: async <ResponseType, Params = Record<string, string | number | boolean | undefined | null>>(
    name: string,
    params?: Params,
    options?: ApiOptions
  ): Promise<CacheResult<ResponseType>> => {
    const settings = getSettingsSafe();

    const apiCall = async (): Promise<ResponseType> => {
      if (settings?.offlineMode) {
        throw new Error('OFFLINE_MODE_NETWORK_BLOCKED');
      }
      // Convert slashes to underscores for URL
      const urlName = name.replace(/\//g, '_');
      const response = await fetch(`/api/process/${urlName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          params,
          options: {
            ...options,
            disableCache: false,
          }
        }),
      });

      if (response.status !== 200) {
        throw new Error(`Failed to call ${name}: HTTP ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result?.data && typeof result.data === 'object' && 'error' in result.data && result.data.error != null) {
        throw new Error(`Failed to call ${name}: ${result.data.error}`);
      }

      return result.data;
    };

    const effectiveOffline = (settings?.offlineMode === true) || (typeof navigator !== 'undefined' && !navigator.onLine);
    const globalSWR = settings?.staleWhileRevalidate === true;

    // Handle offline mode without throwing
    if (effectiveOffline) {
      const cacheKey = clientCacheProvider.generateCacheKey({ key: name, params: params || {} });

      // If cache is explicitly disabled, return error payload
      if (options?.disableCache) {
        return {
          data: { error: 'Network unavailable while offline' } as ResponseType,
          isFromCache: false
        };
      }

      // Try to read from cache
      const cached = await clientCacheProvider.readCacheWithStale<ResponseType>(cacheKey);
      if (cached) {
        return { data: cached.data, isFromCache: true, metadata: cached.metadata };
      }

      // No cache available, return error payload
      return {
        data: { error: "This content isn't available offline yet" } as ResponseType,
        isFromCache: true
      };
    }

    return clientCache.withCache(apiCall, { key: name, params: params || {} }, {
      bypassCache: !globalSWR,
      staleWhileRevalidate: globalSWR,
      disableCache: false,
      ttl: options?.ttl,
      maxStaleAge: options?.maxStaleAge,
      isDataValidForCache: options?.isDataValidForCache,
    });
  },

  /**
   * Direct POST that bypasses client cache entirely.
   * Used for mutations (create, update, delete).
   * 
   * ⚠️ IMPORTANT: OFFLINE MODE BEHAVIOR
   * 
   * When offline, this method returns `{ data: {}, isFromCache: false }`.
   * The request is queued for batch sync when the device comes back online.
   * 
   * CALLERS MUST NEVER ASSUME `data` contains actual response properties.
   * Always guard against empty/undefined data in mutation callbacks:
   * 
   * @example
   * ```typescript
   * useMutation({
   *   mutationFn: async (data) => {
   *     const response = await apiClient.post<ResponseType>('entity/update', data);
   *     return response.data;
   *   },
   *   onSuccess: (data) => {
   *     // ✅ CORRECT: Guard against empty data from offline mode
   *     if (data && data.entity) {
   *       queryClient.setQueryData(['entity', data.entity.id], data);
   *     }
   *     
   *     // ❌ WRONG: Will crash when offline (data.entity is undefined)
   *     queryClient.setQueryData(['entity', data.entity.id], data);
   *   },
   * });
   * ```
   * 
   * The optimistic update pattern handles the UI immediately via `onMutate`.
   * The empty `{}` return ensures no error is thrown and no rollback occurs.
   * The actual sync happens later via batch-updates when online.
   */
  post: async <ResponseType, Params = Record<string, string | number | boolean | undefined | null>>(
    name: string,
    params?: Params,
    options?: ApiOptions
  ): Promise<CacheResult<ResponseType>> => {
    const settings = getSettingsSafe();
    const effectiveOffline = (settings?.offlineMode === true) || (typeof navigator !== 'undefined' && !navigator.onLine);
    if (effectiveOffline) {
      // Queue for later sync when back online
      enqueueOfflinePost<Params>({
        id: generateQueueId(),
        name,
        params,
        options,
        enqueuedAt: Date.now(),
      });

      // Return empty object - NOT an error.
      // Callers MUST handle this case (see JSDoc above).
      // Optimistic updates handle the UI; this just prevents rollback.
      return { data: {} as ResponseType, isFromCache: false };
    }

    // Convert slashes to underscores for URL
    const urlName = name.replace(/\//g, '_');
    const response = await fetch(`/api/process/${urlName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        params,
        options: {
          ...options,
          disableCache: true,
        }
      }),
    });

    if (response.status !== 200) {
      throw new Error(`Failed to call ${name}: HTTP ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result?.data && typeof result.data === 'object' && 'error' in result.data && result.data.error != null) {
      throw new Error(`Failed to call ${name}: ${result.data.error}`);
    }

    return { data: result.data as ResponseType, isFromCache: false };
  }
};

//

export type ApiOptions = {
  /**
   * Disable caching for this API call - will not save the result to cache
   */
  disableCache?: boolean;
  /**
   * Bypass the cache for this API call - will save the result to cache
   */
  bypassCache?: boolean;
  /**
   * Use client-side cache for this API call
   */
  useClientCache?: boolean;
  /**
   * TTL for client-side cache
   */
  ttl?: number;
  /**
   * Max stale age for client-side cache
   */
  maxStaleAge?: number;
  /**
   * Stale while revalidate for client-side cache
   */
  staleWhileRevalidate?: boolean;
  /**
   * Callback to validate if data should be cached
   */
  isDataValidForCache?: <T>(data: T) => boolean;
};

export default apiClient;
