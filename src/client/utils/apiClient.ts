import { CacheResult } from "@/common/cache/types";
import { createCache } from "@/common/cache";
import { localStorageCacheProvider } from "./localStorageCache";

const clientCache = createCache(localStorageCacheProvider)

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
    // Client-side caching wrapper
    const apiCall = async (): Promise<ResponseType> => {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          params,
          options: {
            ...options,
            disableCache: true,
          }
        }),
      });

      // Only cache responses with status 200
      if (response.status !== 200) {
        throw new Error(`Failed to call ${name}: HTTP ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Don't cache if result data is null
      if (result.data === null) {
        throw new Error(`Failed to call ${name}: No data returned`);
      }

      // Don't cache responses with error fields
      if (result.data && typeof result.data === 'object' && 'error' in result.data && result.data.error !== undefined && result.data.error !== null) {
        throw new Error(`Failed to call ${name}: ${result.data.error}`);
      }

      return result.data;
    };

    const shouldUseClientCache = options?.useClientCache ?? true;

    // Use client-side cache if enabled
    if (shouldUseClientCache) {
      return await clientCache.withCache(
        apiCall,
        {
          key: name,
          params: params || {},
        },
        {
          bypassCache: options?.bypassCache ?? false,
          disableCache: options?.disableCache ?? false,
          staleWhileRevalidate: options?.staleWhileRevalidate ?? false,
          ttl: options?.ttl,
          maxStaleAge: options?.maxStaleAge,
          isDataValidForCache: options?.isDataValidForCache,
        }
      );
    }

    // Fallback to direct API call
    const data = await apiCall();
    return { data, isFromCache: false };
  }
};

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
