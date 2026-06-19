import { getTotalCacheSize } from '@/client/stores';
import { PERSISTED_CACHE_KEY } from '@/client/query';

/**
 * Measure the combined client cache size in bytes.
 *
 * Combines:
 * - All persisted zustand stores (via the store registry)
 * - The persisted React Query blob (read straight from localStorage as a
 *   string — cheap, no re-stringifying the live cache)
 *
 * SSR-guarded: returns 0 on the server.
 *
 * KNOWN LIMITATION: this reads the on-disk (throttled) blob, not the live
 * in-memory cache. The persister caps writes at MAX_PERSIST_BYTES (~4MB) and
 * skips the write above that, so once the live cache exceeds the cap the
 * on-disk size freezes at its last <4MB snapshot. The monitor therefore stops
 * crossing into higher 1MB buckets past ~4MB and won't warn again — even
 * though the per-change stringify cost keeps growing. We accept this for v1:
 * the 1–4MB band (where the warning is most actionable) is fully covered, and
 * measuring the live blob would mean re-stringifying it on every check, the
 * very cost we're trying to surface.
 */
export function getCombinedCacheBytes(): number {
    if (typeof window === 'undefined') return 0;

    const storesBytes = getTotalCacheSize().bytes;

    let reactQueryBytes = 0;
    try {
        const raw = window.localStorage.getItem(PERSISTED_CACHE_KEY);
        if (raw) {
            reactQueryBytes = new Blob([raw]).size;
        }
    } catch {
        // Ignore read errors — treat as 0.
    }

    return storesBytes + reactQueryBytes;
}

/** One megabyte in bytes — the threshold bucket size. */
export const ONE_MB = 1024 * 1024;

/**
 * Which 1MB bucket a size falls into (floor). 0 for <1MB, 1 for [1,2)MB, etc.
 */
export function bucketForBytes(bytes: number): number {
    return Math.floor(bytes / ONE_MB);
}
