import { createStore } from '@/client/stores';
import type { FeatureRequestStatus, FeatureRequestPriority } from '@/apis/feature-requests/types';

/**
 * Feature Requests page filter types
 */
export type FeatureRequestsSortOrder = 'asc' | 'desc';

/**
 * UI-only status filter that includes 'all' and 'active'
 * @deprecated Use statusFilters array instead
 */
export type StatusFilterOption = FeatureRequestStatus | 'all' | 'active';

/**
 * GitHub linkage filter options
 */
export type GitHubFilterOption = 'has_issue' | 'has_pr' | 'no_link';

/**
 * Activity filter options
 */
export type ActivityFilterOption = 'recent' | 'stale';

interface FeatureRequestsState {
    // Legacy single-filter state (for backward compatibility)
    statusFilter?: StatusFilterOption;
    priorityFilter?: FeatureRequestPriority | 'all';

    // New multi-filter state
    statusFilters: string[];
    priorityFilters: FeatureRequestPriority[];
    githubFilters: GitHubFilterOption[];
    activityFilters: ActivityFilterOption[];

    sortOrder: FeatureRequestsSortOrder;

    // Actions for multi-filter management
    toggleStatusFilter: (filter: string) => void;
    togglePriorityFilter: (priority: FeatureRequestPriority) => void;
    toggleGitHubFilter: (filter: GitHubFilterOption) => void;
    toggleActivityFilter: (filter: ActivityFilterOption) => void;
    clearAllFilters: () => void;

    // Legacy actions (for backward compatibility)
    setStatusFilter?: (status: StatusFilterOption) => void;
    setPriorityFilter?: (priority: FeatureRequestPriority | 'all') => void;
    setSortOrder: (order: FeatureRequestsSortOrder) => void;
}

/**
 * Feature Requests store - persists filters across sessions
 *
 * Migrates from single-filter to multi-filter approach:
 * - Old: statusFilter: 'active', priorityFilter: 'high'
 * - New: statusFilters: ['active'], priorityFilters: ['high']
 */
export const useFeatureRequestsStore = createStore<FeatureRequestsState>({
    key: 'feature-requests-storage',
    label: 'Feature Requests',
    creator: (set, _get) => ({
        // Initialize with migration from old format if present
        statusFilters: [],
        priorityFilters: [],
        githubFilters: [],
        activityFilters: [],
        sortOrder: 'desc',

        // Multi-filter toggle actions
        toggleStatusFilter: (filter: string) =>
            set((state) => {
                const isActive = state.statusFilters.includes(filter);
                return {
                    statusFilters: isActive
                        ? state.statusFilters.filter((f) => f !== filter)
                        : [...state.statusFilters, filter],
                };
            }),

        togglePriorityFilter: (priority: FeatureRequestPriority) =>
            set((state) => {
                const isActive = state.priorityFilters.includes(priority);
                return {
                    priorityFilters: isActive
                        ? state.priorityFilters.filter((p) => p !== priority)
                        : [...state.priorityFilters, priority],
                };
            }),

        toggleGitHubFilter: (filter: GitHubFilterOption) =>
            set((state) => {
                const isActive = state.githubFilters.includes(filter);
                return {
                    githubFilters: isActive
                        ? state.githubFilters.filter((f) => f !== filter)
                        : [...state.githubFilters, filter],
                };
            }),

        toggleActivityFilter: (filter: ActivityFilterOption) =>
            set((state) => {
                const isActive = state.activityFilters.includes(filter);
                return {
                    activityFilters: isActive
                        ? state.activityFilters.filter((f) => f !== filter)
                        : [...state.activityFilters, filter],
                };
            }),

        clearAllFilters: () =>
            set({
                statusFilters: [],
                priorityFilters: [],
                githubFilters: [],
                activityFilters: [],
            }),

        setSortOrder: (order: FeatureRequestsSortOrder) => set({ sortOrder: order }),
    }),
    persistOptions: {
        partialize: (state) => ({
            statusFilters: state.statusFilters,
            priorityFilters: state.priorityFilters,
            githubFilters: state.githubFilters,
            activityFilters: state.activityFilters,
            sortOrder: state.sortOrder,
        }),
        // Migration function to handle old format
        migrate: (persistedState: Record<string, unknown>, _version: number) => {
            // If old format detected, migrate to new format
            if (persistedState.statusFilter && !persistedState.statusFilters) {
                const statusFilter = persistedState.statusFilter as StatusFilterOption;
                const statusFilters =
                    statusFilter === 'all' || !statusFilter ? [] : [statusFilter];

                const priorityFilter = persistedState.priorityFilter as
                    | FeatureRequestPriority
                    | 'all'
                    | undefined;
                const priorityFilters =
                    !priorityFilter || priorityFilter === 'all' ? [] : [priorityFilter];

                return {
                    statusFilters,
                    priorityFilters,
                    githubFilters: [],
                    activityFilters: [],
                    sortOrder: persistedState.sortOrder || 'desc',
                };
            }

            // Default to 'active' filter if nothing persisted
            if (!persistedState.statusFilters || persistedState.statusFilters.length === 0) {
                return {
                    ...persistedState,
                    statusFilters: ['active'], // Default to 'active' (excludes done, rejected)
                };
            }

            return persistedState;
        },
    },
});
