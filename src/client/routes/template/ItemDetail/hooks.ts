import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFeatureRequest, deleteFeatureRequest, approveFeatureRequest } from '@/apis/template/feature-requests/client';
import { getReport, deleteReport } from '@/apis/template/reports/client';
import { API_APPROVE_BUG_REPORT } from '@/apis/template/reports/index';
import apiClient from '@/client/utils/apiClient';
import type { FeatureRequestClient } from '@/apis/template/feature-requests/types';
import type { ReportClient, ApproveBugReportResponse } from '@/apis/template/reports/types';

export type ItemType = 'feature' | 'bug';

export interface ItemDetail {
    type: ItemType;
    feature?: FeatureRequestClient;
    report?: ReportClient;
}

export function useItemDetail(id: string | undefined) {
    const featureQuery = useQuery({
        queryKey: ['item-detail-feature', id],
        queryFn: async () => {
            const response = await getFeatureRequest({ requestId: id! });
            return response.data?.featureRequest ?? null;
        },
        enabled: !!id,
    });

    const reportQuery = useQuery({
        queryKey: ['item-detail-report', id],
        queryFn: async () => {
            const response = await getReport({ reportId: id! });
            return response.data?.report ?? null;
        },
        enabled: !!id,
    });

    const isLoading = featureQuery.isLoading || reportQuery.isLoading;
    const error = featureQuery.error || reportQuery.error;

    let item: ItemDetail | null = null;
    if (featureQuery.data) {
        item = { type: 'feature', feature: featureQuery.data };
    } else if (reportQuery.data) {
        item = { type: 'bug', report: reportQuery.data };
    }

    return { item, isLoading, error };
}

export function useApproveItem() {
    const queryClient = useQueryClient();

    const approveFeatureMutation = useMutation({
        mutationFn: async (requestId: string) => {
            const response = await approveFeatureRequest({ requestId });
            if (response.data?.error) {
                throw new Error(response.data.error);
            }
            return response.data;
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['item-detail-feature'] });
        },
    });

    const approveBugMutation = useMutation({
        mutationFn: async (reportId: string) => {
            const response = await apiClient.post<ApproveBugReportResponse>(
                API_APPROVE_BUG_REPORT,
                { reportId }
            );
            if (response.data?.error) {
                throw new Error(response.data.error);
            }
            return response.data;
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['item-detail-report'] });
        },
    });

    return {
        approveFeature: approveFeatureMutation.mutateAsync,
        approveBug: approveBugMutation.mutateAsync,
        isPending: approveFeatureMutation.isPending || approveBugMutation.isPending,
    };
}

export function useDeleteItem() {
    const queryClient = useQueryClient();

    const deleteFeatureMutation = useMutation({
        mutationFn: async (requestId: string) => {
            const response = await deleteFeatureRequest({ requestId });
            if (response.data?.error) {
                throw new Error(response.data.error);
            }
            return response.data;
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['item-detail-feature'] });
        },
    });

    const deleteReportMutation = useMutation({
        mutationFn: async (reportId: string) => {
            const response = await deleteReport({ reportId });
            if (response.data?.error) {
                throw new Error(response.data.error);
            }
            return response.data;
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['item-detail-report'] });
        },
    });

    return {
        deleteFeature: deleteFeatureMutation.mutateAsync,
        deleteBug: deleteReportMutation.mutateAsync,
        isPending: deleteFeatureMutation.isPending || deleteReportMutation.isPending,
    };
}
