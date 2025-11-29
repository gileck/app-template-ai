import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserPublicHint } from './types';
import type { UserResponse } from '@/apis/auth/types';

/**
 * Persisted auth hint with timestamp for TTL validation
 */
interface PersistedAuthState {
    isProbablyLoggedIn: boolean;
    userPublicHint: UserPublicHint | null;
    hintTimestamp: number | null;
}

interface AuthState extends PersistedAuthState {
    // Runtime state (not persisted)
    user: UserResponse | null;
    isValidated: boolean;
    isValidating: boolean;
    error: string | null;

    // Actions
    setUserHint: (user: UserPublicHint) => void;
    setValidatedUser: (user: UserResponse) => void;
    setValidating: (validating: boolean) => void;
    setError: (error: string | null) => void;
    clearAuth: () => void;
}

const AUTH_HINT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Check if the auth hint is still valid based on TTL
 */
function isHintValid(timestamp: number | null): boolean {
    if (!timestamp) return false;
    return Date.now() - timestamp < AUTH_HINT_TTL;
}

/**
 * Auth store - replaces AuthContext
 * Persists only the "hint" data for instant boot
 * Full user data is validated at runtime
 */
export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            // Persisted state (hints for instant boot)
            isProbablyLoggedIn: false,
            userPublicHint: null,
            hintTimestamp: null,

            // Runtime state (not persisted)
            user: null,
            isValidated: false,
            isValidating: false,
            error: null,

            // Actions
            setUserHint: (user) => {
                set({
                    isProbablyLoggedIn: true,
                    userPublicHint: user,
                    hintTimestamp: Date.now(),
                });
            },

            setValidatedUser: (user) => {
                // Update both the validated user and the hint
                const hint: UserPublicHint = {
                    id: user.id,
                    name: user.username,
                    email: user.email || '',
                    avatar: user.profilePicture,
                };
                set({
                    user,
                    isValidated: true,
                    isValidating: false,
                    error: null,
                    // Also update the hint for next boot
                    isProbablyLoggedIn: true,
                    userPublicHint: hint,
                    hintTimestamp: Date.now(),
                });
            },

            setValidating: (validating) => {
                set({ isValidating: validating });
            },

            setError: (error) => {
                set({ error, isValidating: false });
            },

            clearAuth: () => {
                set({
                    isProbablyLoggedIn: false,
                    userPublicHint: null,
                    hintTimestamp: null,
                    user: null,
                    isValidated: false,
                    isValidating: false,
                    error: null,
                });
            },
        }),
        {
            name: 'auth-storage',
            // Only persist hint data, not runtime state
            partialize: (state) => ({
                isProbablyLoggedIn: state.isProbablyLoggedIn,
                userPublicHint: state.userPublicHint,
                hintTimestamp: state.hintTimestamp,
            }),
            // Validate TTL on rehydration
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Check if hint is still valid
                    if (!isHintValid(state.hintTimestamp)) {
                        // Clear stale hints
                        state.isProbablyLoggedIn = false;
                        state.userPublicHint = null;
                        state.hintTimestamp = null;
                    }
                }
            },
        }
    )
);

/**
 * Selector hooks for common auth state
 */
export function useIsAuthenticated(): boolean {
    return useAuthStore((state) => state.isValidated && !!state.user);
}

export function useIsProbablyLoggedIn(): boolean {
    return useAuthStore((state) => state.isProbablyLoggedIn);
}

export function useUser(): UserResponse | null {
    return useAuthStore((state) => state.user);
}

export function useUserHint(): UserPublicHint | null {
    return useAuthStore((state) => state.userPublicHint);
}

