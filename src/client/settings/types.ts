// Define the settings type
export interface Settings {
    aiModel: string;
    theme: 'light' | 'dark';
    offlineMode: boolean;
    staleWhileRevalidate: boolean;
}

// Define the settings context type
export interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => void;
    clearCache: () => Promise<{ success: boolean; message: string }>;
    isDeviceOffline?: boolean;
    effectiveOffline?: boolean;
    subscribeToEffectiveOfflineChanges?: (listener: (effectiveOffline: boolean) => void) => () => void;
}

// Default settings
export const defaultSettings: Settings = {
    aiModel: '',
    theme: 'light',
    offlineMode: false,
    staleWhileRevalidate: false,
}; 