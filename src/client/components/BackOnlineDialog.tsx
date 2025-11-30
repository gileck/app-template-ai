/**
 * BackOnlineAlert - Small bottom alert when coming back online
 * 
 * Shows a small alert at the bottom when:
 * 1. Device transitions from offline to online (airplane mode off)
 * 2. User toggles offline mode setting from true to false
 * 
 * Auto-dismisses after 10 seconds. User can click "Refresh" to fetch fresh data.
 */

import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { useQueryClient } from '@tanstack/react-query';
import { Wifi, X } from 'lucide-react';
import { Button } from '@/client/components/ui/button';
import { useSettingsStore } from '@/client/features/settings';

const AUTO_DISMISS_MS = 10000; // 10 seconds

// ============================================================================
// Store for alert state
// ============================================================================

interface BackOnlineAlertState {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
}

export const useBackOnlineAlertStore = create<BackOnlineAlertState>((set) => ({
    isVisible: false,
    show: () => set({ isVisible: true }),
    hide: () => set({ isVisible: false }),
}));

// ============================================================================
// Hook to detect online transition
// ============================================================================

/**
 * Hook that listens for:
 * 1. Browser online events (airplane mode off)
 * 2. Offline mode setting changes (toggled off)
 * 
 * Shows the refresh alert when transitioning from offline to online.
 */
export function useBackOnlineDetector() {
    const showAlert = useBackOnlineAlertStore((state) => state.show);
    const offlineMode = useSettingsStore((state) => state.settings.offlineMode);
    const wasDeviceOffline = useRef(false);
    const wasOfflineModeOn = useRef(false);

    // Track offline mode setting changes
    useEffect(() => {
        // On initial mount, just record the current state
        if (wasOfflineModeOn.current === false && offlineMode === false) {
            // First render with offlineMode false - don't show alert
            return;
        }

        // If transitioning from offlineMode true -> false, show alert
        if (wasOfflineModeOn.current && !offlineMode) {
            showAlert();
        }

        // Update ref for next change
        wasOfflineModeOn.current = offlineMode;
    }, [offlineMode, showAlert]);

    // Initialize offlineMode ref on mount
    useEffect(() => {
        wasOfflineModeOn.current = useSettingsStore.getState().settings.offlineMode;
    }, []);

    // Listen for browser online/offline events
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Track initial device offline state
        wasDeviceOffline.current = !navigator.onLine;

        const handleOnline = () => {
            // Only show alert if device was actually offline before
            // AND we're not in manual offline mode (that's handled separately)
            const isInOfflineMode = useSettingsStore.getState().settings.offlineMode;
            if (wasDeviceOffline.current && !isInOfflineMode) {
                showAlert();
            }
            wasDeviceOffline.current = false;
        };

        const handleOffline = () => {
            wasDeviceOffline.current = true;
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [showAlert]);
}

// ============================================================================
// Alert Component
// ============================================================================

export function BackOnlineAlert() {
    const isVisible = useBackOnlineAlertStore((state) => state.isVisible);
    const hideAlert = useBackOnlineAlertStore((state) => state.hide);
    const queryClient = useQueryClient();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-dismiss after 10 seconds
    useEffect(() => {
        if (isVisible) {
            timerRef.current = setTimeout(() => {
                hideAlert();
            }, AUTO_DISMISS_MS);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isVisible, hideAlert]);

    const handleRefresh = () => {
        // Clear the auto-dismiss timer
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        // Invalidate all queries to trigger refetch
        queryClient.invalidateQueries();
        hideAlert();
    };

    const handleDismiss = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        hideAlert();
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto">
            <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg">
                <Wifi className="h-4 w-4 shrink-0 text-green-500" />
                <span className="flex-1 text-sm">You&apos;re back online</span>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="default" onClick={handleRefresh}>
                        Refresh
                    </Button>
                    <button
                        onClick={handleDismiss}
                        className="shrink-0 rounded p-1 hover:bg-accent"
                        aria-label="Dismiss"
                    >
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Legacy export names for backwards compatibility
export const useBackOnlineDialogStore = useBackOnlineAlertStore;
export const BackOnlineDialog = BackOnlineAlert;

