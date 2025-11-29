import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetchCurrentUser } from '@/apis/auth/client';
import type { CurrentUserResponse } from '@/apis/auth/types';

/**
 * Query key for current user
 */
export const currentUserQueryKey = ['auth', 'currentUser'] as const;

/**
 * Hook to fetch the current authenticated user
 */
export function useCurrentUser(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: currentUserQueryKey,
        queryFn: async (): Promise<CurrentUserResponse> => {
            const response = await apiFetchCurrentUser({
                staleWhileRevalidate: true,
                ttl: 60 * 1000, // 1 minute fresh
                maxStaleAge: 7 * 24 * 60 * 60 * 1000, // 7 days max stale
            });

            if (response.data?.error) {
                throw new Error(response.data.error);
            }

            return response.data;
        },
        enabled: options?.enabled ?? true,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 60 * 60 * 1000, // 1 hour
        retry: (failureCount, error) => {
            // Don't retry on auth errors
            if (error instanceof Error &&
                (error.message.includes('401') ||
                    error.message.includes('unauthorized') ||
                    error.message.includes('Unauthorized'))) {
                return false;
            }
            return failureCount < 2;
        },
    });
}

/**
 * Hook to invalidate current user query
 */
export function useInvalidateCurrentUser() {
    const queryClient = useQueryClient();

    return () => queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
}

