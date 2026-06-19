/**
 * Project-owned React Query persist exclusions.
 *
 * This file is NOT synced from the template — it's owned by your project.
 *
 * List the first segment of any query key whose data should NOT be written to
 * the persisted (localStorage) cache. The React Query localStorage blob shares
 * the browser's ~5MB quota with every zustand store, so excluding large
 * project entities (e.g. long message transcripts) keeps the cache small and
 * the app responsive — the persister re-serializes the whole blob on every
 * change, so its cost scales with size.
 *
 * Matching: a query is excluded when `String(queryKey[0])` equals one of these
 * strings. Excluded queries still work in-memory for the session; they're just
 * not persisted across reloads.
 *
 * Example:
 *   export const projectExcludedQueryKeys: string[] = ['messages', 'threads'];
 */

// Add your project's large/non-persistable query keys below.
export const projectExcludedQueryKeys: string[] = [];
