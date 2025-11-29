import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UIFilters } from './types';

const UI_STATE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Routes that should NOT be persisted/restored
 */
const EXCLUDED_ROUTES = ['/login', '/register', '/logout', '/forgot-password'];

interface UIState {
    // Persisted state
    lastRoute: string | null;
    lastRouteTimestamp: number | null;
    filters: UIFilters;

    // Actions
    setLastRoute: (route: string) => void;
    setFilters: (filters: Partial<UIFilters>) => void;
    clearFilters: () => void;
    getValidLastRoute: () => string | null;
}

/**
 * UI store for persisted UI state
 * Includes last route for restoration after app kill
 */
export const useUIStore = create<UIState>()(
    persist(
        (set, get) => ({
            // Initial state
            lastRoute: null,
            lastRouteTimestamp: null,
            filters: {},

            // Actions
            setLastRoute: (route) => {
                // Don't persist excluded routes
                if (EXCLUDED_ROUTES.some(excluded => route.startsWith(excluded))) {
                    return;
                }
                set({
                    lastRoute: route,
                    lastRouteTimestamp: Date.now(),
                });
            },

            setFilters: (newFilters) => {
                set((state) => ({
                    filters: { ...state.filters, ...newFilters },
                }));
            },

            clearFilters: () => {
                set({ filters: {} });
            },

            getValidLastRoute: () => {
                const state = get();
                // Check if route exists and is not expired
                if (!state.lastRoute || !state.lastRouteTimestamp) {
                    return null;
                }
                // Check TTL
                if (Date.now() - state.lastRouteTimestamp > UI_STATE_TTL) {
                    return null;
                }
                // Don't return excluded routes
                if (EXCLUDED_ROUTES.some(excluded => state.lastRoute?.startsWith(excluded))) {
                    return null;
                }
                return state.lastRoute;
            },
        }),
        {
            name: 'ui-storage',
            // Validate TTL on rehydration
            onRehydrateStorage: () => (state) => {
                if (state && state.lastRouteTimestamp) {
                    // Check if UI state is still valid
                    if (Date.now() - state.lastRouteTimestamp > UI_STATE_TTL) {
                        state.lastRoute = null;
                        state.lastRouteTimestamp = null;
                    }
                }
            },
        }
    )
);

/**
 * Hook to get valid last route for restoration
 */
export function useLastRoute(): string | null {
    return useUIStore((state) => {
        if (!state.lastRoute || !state.lastRouteTimestamp) {
            return null;
        }
        if (Date.now() - state.lastRouteTimestamp > UI_STATE_TTL) {
            return null;
        }
        if (EXCLUDED_ROUTES.some(excluded => state.lastRoute?.startsWith(excluded))) {
            return null;
        }
        return state.lastRoute;
    });
}

