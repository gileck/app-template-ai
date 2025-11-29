/**
 * Zustand stores for persistent state management
 */

// Settings store
export {
    useSettingsStore,
    initializeOfflineListeners,
    subscribeToEffectiveOfflineChanges,
    useEffectiveOffline,
} from './settingsStore';

// Auth store
export {
    useAuthStore,
    useIsAuthenticated,
    useIsProbablyLoggedIn,
    useUser,
    useUserHint,
} from './authStore';

// UI store
export {
    useUIStore,
    useLastRoute,
} from './uiStore';

// Types
export type {
    Settings,
    UserPublicHint,
} from './types';

