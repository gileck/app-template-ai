/**
 * Welcome Toast Store
 * 
 * Tracks whether the welcome toast has been shown to the user.
 * Persisted to localStorage so the toast only shows once per device.
 */

import { createStore } from '@/client/stores';

interface WelcomeToastState {
    hasShownWelcomeToast: boolean;
    setWelcomeToastShown: () => void;
}

export const useWelcomeToastStore = createStore<WelcomeToastState>({
    key: 'welcome-toast-storage',
    label: 'Welcome Toast',
    creator: (set) => ({
        hasShownWelcomeToast: false,
        setWelcomeToastShown: () => {
            set({ hasShownWelcomeToast: true });
        },
    }),
    persistOptions: {
        partialize: (state) => ({ hasShownWelcomeToast: state.hasShownWelcomeToast }),
    },
});
