/**
 * Hook for filtering and sorting feature requests
 */

import { useMemo } from 'react';
import type { FeatureRequestClient } from '@/apis/feature-requests/types';
import { applyFilters } from '../utils/filtering';
import { sortFeatureRequests } from '../utils/sorting';
import { useFeatureRequestsStore } from '../store';
import { ACTIVE_STATUSES } from '../constants';

/**
 * Apply filters and sorting to feature requests
 */
export function useFilteredAndSortedRequests(requests: FeatureRequestClient[] | undefined) {
    const activeStatusFilters = useFeatureRequestsStore((state) => state.activeStatusFilters);
    const activePriorityFilters = useFeatureRequestsStore((state) => state.activePriorityFilters);
    const activeGitHubFilters = useFeatureRequestsStore((state) => state.activeGitHubFilters);
    const activeAssignmentFilters = useFeatureRequestsStore((state) => state.activeAssignmentFilters);
    const activeTimeFilters = useFeatureRequestsStore((state) => state.activeTimeFilters);
    const sortMode = useFeatureRequestsStore((state) => state.sortMode);

    return useMemo(() => {
        if (!requests) return { activeRequests: [], doneRequests: [] };

        // Apply filters
        let filtered = applyFilters(requests, {
            statuses: activeStatusFilters,
            priorities: activePriorityFilters,
            github: activeGitHubFilters,
            assignment: activeAssignmentFilters,
            time: activeTimeFilters,
        });

        // If no status filters active, exclude done/rejected by default
        if (activeStatusFilters.length === 0) {
            filtered = filtered.filter((r) => ACTIVE_STATUSES.includes(r.status));
        }

        // Sort all filtered requests
        const sorted = sortFeatureRequests(filtered, sortMode);

        // Split into active and done sections
        const activeRequests = sorted.filter((r) => r.status !== 'done' && r.status !== 'rejected');
        const doneRequests = sorted
            .filter((r) => r.status === 'done' || r.status === 'rejected')
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return { activeRequests, doneRequests };
    }, [
        requests,
        activeStatusFilters,
        activePriorityFilters,
        activeGitHubFilters,
        activeAssignmentFilters,
        activeTimeFilters,
        sortMode,
    ]);
}
