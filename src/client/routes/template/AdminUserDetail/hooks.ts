/**
 * Admin User Detail Route Hooks
 *
 * Read-only admin page — single query for the per-user "360" view.
 */

import { useQuery } from '@tanstack/react-query';
import { apiGetUserDetail } from '@/apis/template/admin-users/client';
import type { AdminUserDetail } from '@/apis/template/admin-users/types';
import { useQueryDefaults } from '@/client/query';

export function useAdminUserDetail(userId: string | undefined) {
    const queryDefaults = useQueryDefaults();
    return useQuery({
        ...queryDefaults,
        enabled: !!userId,
        queryKey: ['admin-users', 'detail', userId] as const,
        queryFn: async (): Promise<AdminUserDetail> => {
            const result = await apiGetUserDetail({ userId: userId as string });
            if (result.data?.error) throw new Error(result.data.error);
            if (!result.data?.user) throw new Error('User not found');
            return result.data.user;
        },
    });
}
