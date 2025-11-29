/**
 * Route Store
 * 
 * Persists the last visited route for PWA instant boot.
 * When iOS kills the app and user reopens, they return to the same page.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const ROUTE_STATE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Routes that should NOT be persisted/restored
 */
const EXCLUDED_ROUTES = ['/login', '/register', '/logout', '/forgot-password'];

interface RouteState {
    lastRoute: string | null;
    lastRouteTimestamp: number | null;

    setLastRoute: (route: string) => void;
    getValidLastRoute: () => string | null;
}

export const useRouteStore = create<RouteState>()(
    persist(
        (set, get) => ({
            lastRoute: null,
            lastRouteTimestamp: null,

            setLastRoute: (route) => {
                if (EXCLUDED_ROUTES.some(excluded => route.startsWith(excluded))) {
                    return;
                }
                set({
                    lastRoute: route,
                    lastRouteTimestamp: Date.now(),
                });
            },

            getValidLastRoute: () => {
                const state = get();
                if (!state.lastRoute || !state.lastRouteTimestamp) {
                    return null;
                }
                if (Date.now() - state.lastRouteTimestamp > ROUTE_STATE_TTL) {
                    return null;
                }
                if (EXCLUDED_ROUTES.some(excluded => state.lastRoute?.startsWith(excluded))) {
                    return null;
                }
                return state.lastRoute;
            },
        }),
        {
            name: 'route-storage',
            onRehydrateStorage: () => (state) => {
                if (state && state.lastRouteTimestamp) {
                    if (Date.now() - state.lastRouteTimestamp > ROUTE_STATE_TTL) {
                        state.lastRoute = null;
                        state.lastRouteTimestamp = null;
                    }
                }
            },
        }
    )
);

export function useLastRoute(): string | null {
    return useRouteStore((state) => state.getValidLastRoute());
}

