import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAllModels } from '@/server/ai';
import { clearCache as clearCacheApi } from '@/apis/settings/clearCache/client';
import { Settings, SettingsContextType, defaultSettings } from './types';

// Create the context with default values
const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    updateSettings: () => { },
    clearCache: async () => ({ success: false, message: 'Context not initialized' }),
    isDeviceOffline: false,
    effectiveOffline: false,
    subscribeToEffectiveOfflineChanges: () => () => { },
});

// Custom hook to use the settings context
export const useSettings = () => useContext(SettingsContext);

// Settings provider component
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize settings from localStorage or with defaults
    const [settings, setSettings] = useState<Settings>(() => {
        if (typeof window !== 'undefined') {
            const savedSettings = localStorage.getItem('appSettings');
            if (savedSettings) {
                try {
                    const parsedSettings = JSON.parse(savedSettings);
                    // Ensure all keys from defaultSettings are present
                    return { ...defaultSettings, ...parsedSettings };
                } catch (e) {
                    console.error("Failed to parse settings from localStorage", e);
                    // Fallback to default settings if parsing fails
                    return defaultSettings;
                }
            }
        }
        return defaultSettings;
    });

    // Track device online/offline status
    const [isDeviceOffline, setIsDeviceOffline] = useState<boolean>(false);
    const [listeners] = useState<Set<(effectiveOffline: boolean) => void>>(new Set());

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const updateStatus = () => setIsDeviceOffline(!navigator.onLine);
        updateStatus();
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        return () => {
            window.removeEventListener('online', updateStatus);
            window.removeEventListener('offline', updateStatus);
        };
    }, []);

    // Initialize AI model if not set
    useEffect(() => {
        const initializeModel = async () => {
            if (!settings.aiModel) {
                const models = getAllModels(); // This function call might be an issue if getAllModels is not client-side
                if (models.length > 0) {
                    updateSettings({ aiModel: models[0].id });
                }
            }
        };

        initializeModel();
    }, [settings.aiModel]);

    // Save settings to localStorage whenever they change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('appSettings', JSON.stringify(settings));
        }
    }, [settings]);

    // Update settings
    const updateSettings = (newSettings: Partial<Settings>) => {
        setSettings((prevSettings: Settings) => ({
            ...prevSettings,
            ...newSettings,
        }));
    };

    // Clear cache function
    const handleClearCache = async () => {
        try {
            const response = await clearCacheApi({});
            return {
                success: response.data.success,
                message: response.data.message
            };
        } catch (error) {
            console.error('Error clearing cache:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'An unknown error occurred',
            };
        }
    };

    const effectiveOffline = settings.offlineMode || isDeviceOffline;

    // Notify listeners on effectiveOffline change
    useEffect(() => {
        listeners.forEach(listener => {
            try { listener(effectiveOffline); } catch { /* ignore */ }
        });
    }, [effectiveOffline, listeners]);

    const subscribeToEffectiveOfflineChanges = (listener: (effectiveOffline: boolean) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, clearCache: handleClearCache, isDeviceOffline, effectiveOffline, subscribeToEffectiveOfflineChanges }}>
            {children}
        </SettingsContext.Provider>
    );
}; 