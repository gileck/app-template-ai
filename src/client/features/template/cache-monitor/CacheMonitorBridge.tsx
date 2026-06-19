/**
 * CacheMonitorBridge
 *
 * Headless app-root bridge that watches the combined client cache size and
 * notifies the user (via toast) each time it crosses into a new 1MB bucket.
 * The toast offers a "Trim cache" action that shrinks the persisted React
 * Query blob back toward ~1MB.
 *
 * Why a bridge: the React Query persister re-serializes the whole blob on
 * every cache change, so app responsiveness degrades as the cache grows. We
 * surface that to the user without blocking anything.
 *
 * Measurement is cheap (reads already-serialized localStorage strings), and
 * the cache-change subscription is debounced so we don't measure on every
 * keystroke-driven query update.
 */
import { useEffect, useRef } from 'react';
import { getQueryClient, trimPersistedCache } from '@/client/query';
import { toast } from '@/client/components/template/ui/toast';
import { formatBytes } from '@/client/lib/utils';
import { logger } from '@/client/features/template/session-logs';
import { useCacheMonitorStore } from './store';
import { getCombinedCacheBytes, bucketForBytes } from './measure';

// Debounce cache-change bursts before measuring.
const DEBOUNCE_MS = 1500;
// Safety-net interval in case no cache events fire but size changed elsewhere.
const INTERVAL_MS = 30_000;
// How long the notification stays up (it carries an action).
const TOAST_DURATION_MS = 10_000;

function runTrim() {
    const { removedCount, freedBytes } = trimPersistedCache();
    if (removedCount > 0) {
        toast.success(`Trimmed cache — freed ${formatBytes(freedBytes)} (${removedCount} queries)`);
    } else {
        toast.info('Cache is already within target — nothing to trim');
    }
}

export function CacheMonitorBridge(): null {
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const check = () => {
            const bytes = getCombinedCacheBytes();
            const bucket = bucketForBytes(bytes);
            const { lastNotifiedBucketMB, setLastNotifiedBucketMB } = useCacheMonitorStore.getState();

            if (bucket > lastNotifiedBucketMB) {
                // Crossed into a new (higher) 1MB bucket — notify.
                logger.warn('cache', `Cache crossed ${bucket}MB`, {
                    meta: { bytes, bucket, formatted: formatBytes(bytes) },
                });
                toast.info(`Cache is large (${formatBytes(bytes)}). The app may slow down.`, {
                    duration: TOAST_DURATION_MS,
                    actions: [{ label: 'Trim cache', onClick: runTrim }],
                });
                setLastNotifiedBucketMB(bucket);
            } else if (bucket < lastNotifiedBucketMB) {
                // Cache shrank — arm future crossings of the buckets we dropped below.
                setLastNotifiedBucketMB(bucket);
            }
        };

        const scheduleCheck = () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(check, DEBOUNCE_MS);
        };

        // Subscribe to React Query cache changes (the main growth driver).
        const unsubscribe = getQueryClient().getQueryCache().subscribe(scheduleCheck);

        // Safety-net poll + an initial check shortly after mount.
        const interval = setInterval(check, INTERVAL_MS);
        const initial = setTimeout(check, DEBOUNCE_MS);

        return () => {
            unsubscribe();
            clearInterval(interval);
            clearTimeout(initial);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    return null;
}
