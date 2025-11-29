import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { Settings } from './types';

/**
 * Default settings values
 */
const defaultSettings: Settings = {
    aiModel: '',
    theme: 'light',
    offlineMode: false,
    staleWhileRevalidate: false,
};

interface SettingsState {
    // State
    settings: Settings;
    isDeviceOffline: boolean;

    // Actions
    updateSettings: (newSettings: Partial<Settings>) => void;
    setDeviceOffline: (offline: boolean) => void;
}

/**
 * Settings store - replaces SettingsContext
 * Persists to localStorage automatically via zustand/persist middleware
 */
export const useSettingsStore = create<SettingsState>()(
    subscribeWithSelector(
        persist(
            (set) => ({
                // Initial state
                settings: defaultSettings,
                isDeviceOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,

                // Actions
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
                // Only persist the settings object, not device offline status
                partialize: (state) => ({ settings: state.settings }),
            }
        )
    )
);

/**
 * Initialize device offline listeners
 * Call this once at app startup
 */
export function initializeOfflineListeners() {
    if (typeof window === 'undefined') return;

    const updateStatus = () => {
        useSettingsStore.getState().setDeviceOffline(!navigator.onLine);
    };

    // Set initial status
    updateStatus();

    // Listen for changes
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Return cleanup function
    return () => {
        window.removeEventListener('online', updateStatus);
        window.removeEventListener('offline', updateStatus);
    };
}

/**
 * Helper to compute effective offline from state
 */
function getEffectiveOffline(state: SettingsState): boolean {
    return state.settings.offlineMode || state.isDeviceOffline;
}

/**
 * Subscribe to effective offline changes
 * Returns unsubscribe function
 */
export function subscribeToEffectiveOfflineChanges(
    callback: (effectiveOffline: boolean) => void
): () => void {
    // Subscribe to both settings.offlineMode and isDeviceOffline changes
    const unsubSettings = useSettingsStore.subscribe(
        (state) => state.settings.offlineMode,
        () => {
            callback(getEffectiveOffline(useSettingsStore.getState()));
        }
    );

    const unsubDevice = useSettingsStore.subscribe(
        (state) => state.isDeviceOffline,
        () => {
            callback(getEffectiveOffline(useSettingsStore.getState()));
        }
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

