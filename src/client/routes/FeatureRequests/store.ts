import { createStore } from '@/client/stores';
import type { FeatureRequestStatus, FeatureRequestPriority } from '@/apis/feature-requests/types';
import type {
    GitHubFilterOption,
    AssignmentFilterOption,
    TimeFilterOption,
    SortMode,
} from './constants';

export type StatusFilterOption = FeatureRequestStatus | 'all' | 'active';

interface FeatureRequestsState {
    // Legacy filter properties (for backward compatibility)
    statusFilter: StatusFilterOption;
    setStatusFilter: (filter: StatusFilterOption) => void;
    priorityFilter: FeatureRequestPriority | 'all';
    setPriorityFilter: (filter: FeatureRequestPriority | 'all') => void;
    sortOrder: 'asc' | 'desc';
    setSortOrder: (order: 'asc' | 'desc') => void;
    // Filter state - using arrays for multi-select chips
    activeStatusFilters: FeatureRequestStatus[];
    activePriorityFilters: FeatureRequestPriority[];
    activeGitHubFilters: GitHubFilterOption[];
    activeAssignmentFilters: AssignmentFilterOption[];
    activeTimeFilters: TimeFilterOption[];

    // Sort configuration
    sortMode: SortMode;

    // UI state
    isDonesSectionCollapsed: boolean;

    // Actions
    toggleStatusFilter: (status: FeatureRequestStatus) => void;
    togglePriorityFilter: (priority: FeatureRequestPriority) => void;
    toggleGitHubFilter: (filter: GitHubFilterOption) => void;
    toggleAssignmentFilter: (filter: AssignmentFilterOption) => void;
    toggleTimeFilter: (filter: TimeFilterOption) => void;
    clearAllFilters: () => void;
    setSortMode: (mode: SortMode) => void;
    toggleDonesSectionCollapsed: () => void;
}

/**
 * Feature Requests store - persists filters and UI state across sessions
 */
export const useFeatureRequestsStore = createStore<FeatureRequestsState>({
    key: 'feature-requests-storage',
    label: 'Feature Requests',
    creator: (set) => ({
        // Default: no filters (show all active items, excluding done/rejected)
        activeStatusFilters: [],
        activePriorityFilters: [],
        activeGitHubFilters: [],
        activeAssignmentFilters: [],
        activeTimeFilters: [],

        // Default sort: attention-based
        sortMode: 'attention',

        // Done section collapsed by default
        isDonesSectionCollapsed: true,

        // Legacy filter properties (for backward compatibility)
        statusFilter: 'all',
        setStatusFilter: (filter: StatusFilterOption) => set({ statusFilter: filter }),
        priorityFilter: 'all',
        setPriorityFilter: (filter: FeatureRequestPriority | 'all') => set({ priorityFilter: filter }),
        sortOrder: 'desc',
        setSortOrder: (order: 'asc' | 'desc') => set({ sortOrder: order }),

        // Toggle status filter (add if not present, remove if present)
        toggleStatusFilter: (status: FeatureRequestStatus) =>
            set((state) => ({
                activeStatusFilters: state.activeStatusFilters.includes(status)
                    ? state.activeStatusFilters.filter((s) => s !== status)
                    : [...state.activeStatusFilters, status],
            })),

        // Toggle priority filter
        togglePriorityFilter: (priority: FeatureRequestPriority) =>
            set((state) => ({
                activePriorityFilters: state.activePriorityFilters.includes(priority)
                    ? state.activePriorityFilters.filter((p) => p !== priority)
                    : [...state.activePriorityFilters, priority],
            })),

        // Toggle GitHub filter
        toggleGitHubFilter: (filter: GitHubFilterOption) =>
            set((state) => ({
                activeGitHubFilters: state.activeGitHubFilters.includes(filter)
                    ? state.activeGitHubFilters.filter((f) => f !== filter)
                    : [...state.activeGitHubFilters, filter],
            })),

        // Toggle assignment filter
        toggleAssignmentFilter: (filter: AssignmentFilterOption) =>
            set((state) => ({
                activeAssignmentFilters: state.activeAssignmentFilters.includes(filter)
                    ? state.activeAssignmentFilters.filter((f) => f !== filter)
                    : [...state.activeAssignmentFilters, filter],
            })),

        // Toggle time filter
        toggleTimeFilter: (filter: TimeFilterOption) =>
            set((state) => ({
                activeTimeFilters: state.activeTimeFilters.includes(filter)
                    ? state.activeTimeFilters.filter((f) => f !== filter)
                    : [...state.activeTimeFilters, filter],
            })),

        // Clear all filters
        clearAllFilters: () =>
            set({
                activeStatusFilters: [],
                activePriorityFilters: [],
                activeGitHubFilters: [],
                activeAssignmentFilters: [],
                activeTimeFilters: [],
            }),

        // Set sort mode
        setSortMode: (mode: SortMode) => set({ sortMode: mode }),

        // Toggle done section collapsed state
        toggleDonesSectionCollapsed: () =>
            set((state) => ({
                isDonesSectionCollapsed: !state.isDonesSectionCollapsed,
            })),
    }),
    persistOptions: {
        partialize: (state) => ({
            activeStatusFilters: state.activeStatusFilters,
            activePriorityFilters: state.activePriorityFilters,
            activeGitHubFilters: state.activeGitHubFilters,
            activeAssignmentFilters: state.activeAssignmentFilters,
            activeTimeFilters: state.activeTimeFilters,
            sortMode: state.sortMode,
            isDonesSectionCollapsed: state.isDonesSectionCollapsed,
            statusFilter: state.statusFilter,
            priorityFilter: state.priorityFilter,
            sortOrder: state.sortOrder,
        }),
    },
});
