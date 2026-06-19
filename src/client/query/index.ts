/**
 * React Query setup with IndexedDB persistence
 */

export { QueryProvider } from './QueryProvider';
export { getQueryClient, createQueryClient } from './queryClient';
export { createIDBPersister, PERSISTED_CACHE_KEY } from './persister';
export { dehydrateOptions, EXCLUDED_QUERY_KEYS } from './dehydrateOptions';
export { trimPersistedCache, TRIM_TARGET_BYTES } from './trimCache';
export type { TrimResult } from './trimCache';
export { useQueryDefaults, CACHE_TIMES, MUTATION_DEFAULTS } from './defaults';
export { useOptimisticMutation } from './useOptimisticMutation';
export type { UseOptimisticMutationOptions } from './useOptimisticMutation';

