import { createStore } from '@/client/stores';

interface CacheMonitorState {
    /**
     * The highest 1MB bucket we've already notified the user about. Prevents
     * re-toasting the same crossing on every cache write. Reset to a lower
     * value when the cache shrinks back below a bucket so future crossings
     * notify again.
     */
    lastNotifiedBucketMB: number;
    setLastNotifiedBucketMB: (bucket: number) => void;
}

export const useCacheMonitorStore = createStore<CacheMonitorState>({
    key: 'cache-monitor-storage',
    label: 'Cache Monitor',
    creator: (set) => ({
        lastNotifiedBucketMB: 0,
        setLastNotifiedBucketMB: (bucket) => set({ lastNotifiedBucketMB: bucket }),
    }),
    persistOptions: {
        partialize: (state) => ({ lastNotifiedBucketMB: state.lastNotifiedBucketMB }),
    },
});
