import type { Settings } from "@/client/settings/types";

type PrimitiveParam = string | number | boolean | undefined | null;
export interface OfflinePostQueueItem<Params = Record<string, PrimitiveParam>> {
    id: string;
    name: string;
    params: Params | undefined;
    options?: unknown | undefined;
    enqueuedAt: number;
}

const OFFLINE_POST_QUEUE_STORAGE_KEY = 'apiClient_offline_post_queue_v1';
let queueFlushInProgress = false;

export function loadOfflineQueue(): OfflinePostQueueItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(OFFLINE_POST_QUEUE_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveOfflineQueue(queue: OfflinePostQueueItem[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(OFFLINE_POST_QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch {
        // ignore write failures
    }
}

export function enqueueOfflinePost<Params = Record<string, PrimitiveParam>>(item: OfflinePostQueueItem<Params>): void {
    const q = loadOfflineQueue();
    q.push(item as OfflinePostQueueItem);
    saveOfflineQueue(q);
}

export function generateQueueId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function shouldFlushNow(settings: Settings | null | undefined): boolean {
    const deviceOnline = typeof navigator === 'undefined' ? false : navigator.onLine;
    const offlineMode = settings?.offlineMode === true;
    return deviceOnline && !offlineMode;
}

export async function flushOfflineQueue(getSettings: () => Settings | null | undefined): Promise<void> {
    if (queueFlushInProgress) return;
    const settings = getSettings();
    if (!shouldFlushNow(settings)) return;

    queueFlushInProgress = true;
    try {
        const q = loadOfflineQueue();
        while (q.length > 0) {
            const item = q[0];
            try {
                const response = await fetch('/api/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: item.name,
                        params: item.params,
                        options: { ...(item.options as Record<string, unknown> || {}), disableCache: true },
                    }),
                });
                if (response.status !== 200) {
                    break;
                }
                q.shift();
                saveOfflineQueue(q);
            } catch {
                break;
            }
        }
    } finally {
        queueFlushInProgress = false;
    }
}

// Online listener handled externally via Settings subscription


