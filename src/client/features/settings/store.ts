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

/**
 * Initialize device offline listeners
 */
export function initializeOfflineListeners() {
    if (typeof window === 'undefined') return;

    const updateStatus = () => {
        useSettingsStore.getState().setDeviceOffline(!navigator.onLine);
    };

    // Set initial status
    updateStatus();

    // Listen for network changes
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

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

