import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/client/stores';
import { apiFetchCurrentUser } from '@/apis/auth/client';
import type { UserResponse } from '@/apis/auth/types';
import type { UserPublicHint } from '@/client/stores/types';

/**
 * Query key for current user
 */
export const currentUserQueryKey = ['auth', 'currentUser'] as const;

/**
 * Hook that implements the instant-boot auth pattern:
 * 
 * 1. On mount, Zustand hydrates `isProbablyLoggedIn` + `userPublicHint` from localStorage
 * 2. If `isProbablyLoggedIn`, the app shows authenticated shell immediately
 * 3. This hook calls `/me` endpoint via React Query in background
 * 4. If valid response: updates `user` runtime state and refreshes hint
 * 5. If 401/error: clears auth state
 * 
 * @returns Auth validation state
 */
export function useAuthValidation() {
    const {
        isProbablyLoggedIn,
        userPublicHint,
        isValidated,
        isValidating,
        user,
        setValidatedUser,
        setValidating,
        setError,
        clearAuth,
    } = useAuthStore();

    // Track if we've already run validation this session
    const hasValidated = useRef(false);

    // Use React Query for the /me endpoint
    const {
        data,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: currentUserQueryKey,
        queryFn: async () => {
            const response = await apiFetchCurrentUser({
                // Use stale-while-revalidate for instant boot
                staleWhileRevalidate: true,
                ttl: 60 * 1000, // 1 minute fresh
                maxStaleAge: 7 * 24 * 60 * 60 * 1000, // 7 days max stale
            });

            if (response.data?.error) {
                throw new Error(response.data.error);
            }

            return response.data;
        },
        // Only run if we think we might be logged in
        enabled: isProbablyLoggedIn && !hasValidated.current,
        // Don't retry on auth errors
        retry: (failureCount, error) => {
            // Don't retry on 401 or auth errors
            if (error instanceof Error &&
                (error.message.includes('401') ||
                    error.message.includes('unauthorized') ||
                    error.message.includes('Unauthorized'))) {
                return false;
            }
            return failureCount < 2;
        },
        // Keep stale data while revalidating
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 60 * 60 * 1000, // 1 hour
    });

    // Handle validation result
    useEffect(() => {
        if (isLoading) {
            setValidating(true);
            return;
        }

        // Handle successful validation
        if (data?.user && !isError) {
            hasValidated.current = true;
            setValidatedUser(data.user);
            return;
        }

        // Handle error (unauthorized or network error)
        if (isError || (data && !data.user)) {
            hasValidated.current = true;
            // Clear auth state on validation failure
            if (isProbablyLoggedIn) {
                clearAuth();
            }
            if (error instanceof Error) {
                setError(error.message);
            }
        }
    }, [data, isLoading, isError, error, isProbablyLoggedIn, setValidatedUser, setValidating, clearAuth, setError]);

    // Force re-validation function
    const revalidate = async () => {
        hasValidated.current = false;
        setValidating(true);
        await refetch();
    };

    return {
        // Whether the user is definitely authenticated (validated)
        isAuthenticated: isValidated && !!user,
        // Whether we think the user might be logged in (for instant boot UI)
        isProbablyLoggedIn,
        // The validated user object
        user,
        // The hint for instant boot (before validation completes)
        userHint: userPublicHint,
        // Whether validation is in progress
        isValidating: isLoading || isValidating,
        // Whether validation has completed
        isValidated,
        // Any validation error
        error: error instanceof Error ? error.message : null,
        // Function to force re-validation
        revalidate,
    };
}

/**
 * Convert a full UserResponse to a UserPublicHint
 */
export function userToHint(user: UserResponse): UserPublicHint {
    return {
        id: user.id,
        name: user.username,
        email: user.email || '',
        avatar: user.profilePicture,
    };
}

