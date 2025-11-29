import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiLogin, apiLogout, apiRegister } from '@/apis/auth/client';
import { useAuthStore } from '@/client/stores';
import { currentUserQueryKey } from '../queries/useCurrentUser';
import type { LoginRequest, RegisterRequest, UserResponse } from '@/apis/auth/types';
import type { UserPublicHint } from '@/client/stores/types';

/**
 * Convert UserResponse to UserPublicHint
 */
function userToHint(user: UserResponse): UserPublicHint {
    return {
        id: user.id,
        name: user.username,
        email: user.email || '',
        avatar: user.profilePicture,
    };
}

/**
 * Hook for login mutation
 */
export function useLogin() {
    const queryClient = useQueryClient();
    const { setValidatedUser, setUserHint, setError } = useAuthStore();

    return useMutation({
        mutationFn: async (credentials: LoginRequest) => {
            const response = await apiLogin(credentials);

            if (response.data?.error) {
                throw new Error(response.data.error);
            }

            if (!response.data?.user) {
                throw new Error('Login failed: No user returned');
            }

            return response.data.user;
        },
        onSuccess: (user) => {
            // Update auth store with validated user
            setValidatedUser(user);
            // Also set the hint for instant boot
            setUserHint(userToHint(user));
            // Invalidate current user query to refetch
            queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
        },
        onError: (error) => {
            setError(error instanceof Error ? error.message : 'Login failed');
        },
    });
}

/**
 * Hook for register mutation
 */
export function useRegister() {
    const queryClient = useQueryClient();
    const { setValidatedUser, setUserHint, setError } = useAuthStore();

    return useMutation({
        mutationFn: async (data: RegisterRequest) => {
            const response = await apiRegister(data);

            if (response.data?.error) {
                throw new Error(response.data.error);
            }

            if (!response.data?.user) {
                throw new Error('Registration failed: No user returned');
            }

            return response.data.user;
        },
        onSuccess: (user) => {
            // Update auth store with validated user
            setValidatedUser(user);
            // Also set the hint for instant boot
            setUserHint(userToHint(user));
            // Invalidate current user query
            queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
        },
        onError: (error) => {
            setError(error instanceof Error ? error.message : 'Registration failed');
        },
    });
}

/**
 * Hook for logout mutation
 */
export function useLogout() {
    const queryClient = useQueryClient();
    const { clearAuth } = useAuthStore();

    return useMutation({
        mutationFn: async () => {
            const response = await apiLogout();

            if (response.data?.error) {
                throw new Error(response.data.error);
            }

            return response.data;
        },
        onSuccess: () => {
            // Clear auth store
            clearAuth();
            // Clear all queries (user is no longer authenticated)
            queryClient.clear();
        },
        onError: () => {
            // Even on error, clear auth state (better safe than sorry)
            clearAuth();
            queryClient.clear();
        },
    });
}

