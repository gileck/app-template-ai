import { dehydrate } from '@tanstack/react-query';
import { getQueryClient } from './queryClient';
import { dehydrateOptions } from './dehydrateOptions';
import { logger } from '@/client/features/template/session-logs';
import { formatBytes } from '@/client/lib/utils';

/**
 * Default trim target: shrink the persisted React Query blob down to ~1MB.
 * 1MB keeps the persister's per-change JSON.stringify cost low while leaving
 * room for the most useful (fresh) cached data.
 */
export const TRIM_TARGET_BYTES = 1024 * 1024;

/**
 * Result of a trim pass.
 */
export interface TrimResult {
    removedCount: number;
    freedBytes: number;
}

interface TrimEntry {
    queryKey: readonly unknown[];
    size: number;
    stale: boolean;
}

/**
 * Measure each persisted query as the persister serializes it.
 *
 * We dehydrate the live cache with the SAME `dehydrateOptions` the persister
 * uses, so the set of queries (and the per-query payloads) we sum here
 * approximates what lands in localStorage (e.g. excluded keys like `reports`
 * and non-success queries are skipped). The per-query sum is a heuristic — it
 * omits the surrounding blob wrapper (`{ clientState, timestamp, buster }`,
 * mutations, JSON delimiters) so the total is slightly below the real on-disk
 * blob size. That's fine: the 1MB target is itself a heuristic.
 */
function buildEntries(): { entries: TrimEntry[]; totalBytes: number } {
    const queryClient = getQueryClient();
    const dehydrated = dehydrate(queryClient, dehydrateOptions);
    const cache = queryClient.getQueryCache();

    const entries: TrimEntry[] = [];
    let totalBytes = 0;

    for (const dq of dehydrated.queries) {
        const size = new Blob([JSON.stringify(dq)]).size;
        totalBytes += size;
        // Map back to the live query (by queryHash) to ask isStale(). If the
        // dehydrated query no longer exists in the live cache, treat it as
        // stale — it's safe to drop.
        const liveQuery = cache.get(dq.queryHash);
        const stale = liveQuery?.isStale() ?? true;
        entries.push({ queryKey: dq.queryKey, size, stale });
    }

    return { entries, totalBytes };
}

/**
 * Trim the persisted React Query cache down to `targetBytes`.
 *
 * Eviction order: stale queries first (largest-first), then — only if still
 * over target — fresh queries (largest-first). Fresh data is the most useful,
 * so we only sacrifice it as a last resort.
 *
 * Removing queries from the live cache triggers the persister to re-write a
 * smaller blob on its next throttled flush.
 */
export function trimPersistedCache(targetBytes: number = TRIM_TARGET_BYTES): TrimResult {
    const queryClient = getQueryClient();
    const { entries, totalBytes } = buildEntries();

    if (totalBytes <= targetBytes) {
        return { removedCount: 0, freedBytes: 0 };
    }

    // Stale first, then fresh — each group sorted largest-first.
    const stale = entries.filter((e) => e.stale).sort((a, b) => b.size - a.size);
    const fresh = entries.filter((e) => !e.stale).sort((a, b) => b.size - a.size);
    const ordered = [...stale, ...fresh];

    let freedBytes = 0;
    let removedCount = 0;

    for (const entry of ordered) {
        if (totalBytes - freedBytes <= targetBytes) {
            break;
        }
        queryClient.removeQueries({ queryKey: entry.queryKey, exact: true });
        freedBytes += entry.size;
        removedCount += 1;
    }

    logger.info('cache', `Trimmed React Query cache`, {
        meta: {
            removedCount,
            freedBytes,
            freedFormatted: formatBytes(freedBytes),
            beforeBytes: totalBytes,
            beforeFormatted: formatBytes(totalBytes),
            targetBytes,
            targetFormatted: formatBytes(targetBytes),
        },
    });

    return { removedCount, freedBytes };
}
