/**
 * React Query dehydrate options — single source of truth.
 *
 * Shared by:
 * - QueryProvider (controls what the persister serializes to localStorage)
 * - trimCache (measures each query exactly as the persister sees it)
 *
 * Lives in its own module so the trim helper can import the predicate without
 * creating a QueryProvider <-> trimCache import cycle.
 */

import { projectExcludedQueryKeys } from './persist-exclusions.project';

// Query keys that should NOT be persisted.
// These are either too large or not worth caching.
// Template defaults + project-owned exclusions (persist-exclusions.project.ts),
// so a child project can exclude its own large entities without editing the
// template. Matched on the first queryKey segment.
export const EXCLUDED_QUERY_KEYS = [
    'reports', // Reports contain huge session logs and performance entries
    ...projectExcludedQueryKeys,
];

// Dehydrate options - stable reference at module level
export const dehydrateOptions = {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[]; state: { status: string; error: unknown } }) => {
        // Only persist successful queries
        if (query.state.status !== 'success') {
            return false;
        }
        // Don't persist queries with errors
        if (query.state.error) {
            return false;
        }
        // Don't persist excluded query keys (e.g., large reports data)
        const firstKey = query.queryKey[0];
        if (typeof firstKey === 'string' && EXCLUDED_QUERY_KEYS.includes(firstKey)) {
            return false;
        }
        // Don't persist mutations
        return true;
    },
};
