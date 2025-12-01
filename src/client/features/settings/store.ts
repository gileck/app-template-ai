/**
 * Settings Store
 * 
 * Manages user preferences with localStorage persistence.
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { Settings } from './types';
import { defaultSettings } from './types';

interface SettingsState {
    settings: Settings;
    isDeviceOffline: boolean;

    updateSettings: (newSettings: Partial<Settings>) => void;
    setDeviceOffline: (offline: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    subscribeWithSelector(
        persist(
            (set) => ({
                settings: defaultSettings,
                // Always start as online, let initializeOfflineListeners set the real value
                isDeviceOffline: false,

                updateSettings: (newSettings) => {
                    set((state) => ({
                        settings: { ...state.settings, ...newSettings },
                    }));
                },

                setDeviceOffline: (offline) => {
                    set({ isDeviceOffline: offline });
                },
            }),
            {
                name: 'settings-storage',
                partialize: (state) => ({ settings: state.settings }),
            }
        )
    )
);

// Debug logger for iOS network issues
function debugLog(message: string) {
    const logs = JSON.parse(localStorage.getItem('_debug_logs') || '[]');
    logs.push(`${new Date().toISOString()}: ${message}`);
    // Keep only last 50 logs
    if (logs.length > 50) logs.shift();
    localStorage.setItem('_debug_logs', JSON.stringify(logs));
    console.log('[DEBUG]', message);
}

// Export for debugging - call window._getDebugLogs() in console
if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)._getDebugLogs = () => {
        const logs = JSON.parse(localStorage.getItem('_debug_logs') || '[]');
        console.log(logs.join('\n'));
        return logs;
    };
    (window as unknown as Record<string, unknown>)._clearDebugLogs = () => {
        localStorage.removeItem('_debug_logs');
        console.log('Debug logs cleared');
    };
}

/**
 * Initialize device offline listeners
 */
export function initializeOfflineListeners() {
    if (typeof window === 'undefined') return;

    debugLog('initializeOfflineListeners called');

    const updateStatus = () => {
        const online = navigator.onLine;
        debugLog(`Network status changed: ${online ? 'ONLINE' : 'OFFLINE'}`);
        useSettingsStore.getState().setDeviceOffline(!online);
    };

    // Set initial status
    updateStatus();

    // Listen for network changes
    window.addEventListener('online', () => {
        debugLog('online event fired');
        updateStatus();
    });
    window.addEventListener('offline', () => {
        debugLog('offline event fired');
        updateStatus();
    });

    return () => {
        window.removeEventListener('online', updateStatus);
        window.removeEventListener('offline', updateStatus);
    };
}

/**
 * Subscribe to effective offline changes
 */
export function subscribeToEffectiveOfflineChanges(
    callback: (effectiveOffline: boolean) => void
): () => void {
    const getEffectiveOffline = () => {
        const state = useSettingsStore.getState();
        return state.settings.offlineMode || state.isDeviceOffline;
    };

    const unsubSettings = useSettingsStore.subscribe(
        (state) => state.settings.offlineMode,
        () => callback(getEffectiveOffline())
    );

    const unsubDevice = useSettingsStore.subscribe(
        (state) => state.isDeviceOffline,
        () => callback(getEffectiveOffline())
    );

    return () => {
        unsubSettings();
        unsubDevice();
    };
}

/**
 * Hook to get effective offline status
 */
export function useEffectiveOffline(): boolean {
    const offlineMode = useSettingsStore((state) => state.settings.offlineMode);
    const isDeviceOffline = useSettingsStore((state) => state.isDeviceOffline);
    return offlineMode || isDeviceOffline;
}

