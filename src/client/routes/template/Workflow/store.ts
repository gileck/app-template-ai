import { createStore } from '@/client/stores';

export type TypeFilter = 'all' | 'feature' | 'bug';
export type ViewFilter = 'all' | 'pending' | 'active' | 'done';
export type SelectableItem = { type: 'feature' | 'bug'; mongoId: string };
/** The three main display modes for the workflow page */
export type WorkflowViewMode = 'list' | 'kanban' | 'timeline';

interface WorkflowPageState {
    // Persisted (survives navigation + page refresh)
    typeFilter: TypeFilter;
    viewFilter: ViewFilter;
    collapsedSections: string[];
    /** Active view mode: list, kanban, or timeline */
    viewMode: WorkflowViewMode;
    /** Kanban view: array of expanded section status strings (persistent) */
    kanbanExpandedSections: string[];

    // Non-persisted (survives navigation only, resets on page refresh)
    selectedItemId: string | null;
    selectMode: boolean;
    selectedItems: Record<string, SelectableItem>;
    showBulkDeleteConfirm: boolean;
    isBulkDeleting: boolean;
    isBulkApproving: boolean;

    // Actions
    setTypeFilter: (filter: TypeFilter) => void;
    setViewFilter: (filter: ViewFilter) => void;
    toggleSection: (section: string) => void;
    toggleAllSections: (allKeys: readonly string[]) => void;
    setSelectedItemId: (id: string | null) => void;
    toggleSelectMode: () => void;
    toggleItemSelect: (key: string, item: SelectableItem) => void;
    setShowBulkDeleteConfirm: (show: boolean) => void;
    setIsBulkDeleting: (deleting: boolean) => void;
    setIsBulkApproving: (approving: boolean) => void;
    resetBulkDelete: () => void;
    setViewMode: (mode: WorkflowViewMode) => void;
    /** Toggle a Kanban section's expanded state */
    toggleKanbanSection: (status: string) => void;
    /** Initialize Kanban expanded sections (if not already set) with defaults */
    initKanbanSections: (statusesWithItems: string[]) => void;
}

export const useWorkflowPageStore = createStore<WorkflowPageState>({
    key: 'workflow-page-storage',
    label: 'Workflow Page',
    creator: (set, get) => ({
        typeFilter: 'all',
        viewFilter: 'all',
        viewMode: 'list',
        collapsedSections: [],
        kanbanExpandedSections: [],
        selectedItemId: null,
        selectMode: false,
        selectedItems: {},
        showBulkDeleteConfirm: false,
        isBulkDeleting: false,
        isBulkApproving: false,

        setTypeFilter: (filter) => set({ typeFilter: filter }),
        setViewFilter: (filter) => set({ viewFilter: filter }),

        toggleSection: (section) =>
            set((state) => {
                const isCollapsed = state.collapsedSections.includes(section);
                return {
                    collapsedSections: isCollapsed
                        ? state.collapsedSections.filter((s) => s !== section)
                        : [...state.collapsedSections, section],
                };
            }),

        toggleAllSections: (allKeys) =>
            set((state) => ({
                collapsedSections: state.collapsedSections.length > 0
                    ? []
                    : [...allKeys],
            })),

        setSelectedItemId: (id) => set({ selectedItemId: id }),

        toggleSelectMode: () =>
            set((state) => ({
                selectMode: !state.selectMode,
                selectedItems: state.selectMode ? {} : state.selectedItems,
            })),

        toggleItemSelect: (key, item) =>
            set((state) => {
                const next = { ...state.selectedItems };
                if (key in next) delete next[key];
                else next[key] = item;
                return { selectedItems: next };
            }),

        setShowBulkDeleteConfirm: (show) => set({ showBulkDeleteConfirm: show }),
        setIsBulkDeleting: (deleting) => set({ isBulkDeleting: deleting }),
        setIsBulkApproving: (approving) => set({ isBulkApproving: approving }),

        resetBulkDelete: () =>
            set({
                isBulkDeleting: false,
                isBulkApproving: false,
                showBulkDeleteConfirm: false,
                selectedItems: {},
                selectMode: false,
            }),

        setViewMode: (mode) => set({ viewMode: mode }),

        toggleKanbanSection: (status) =>
            set((state) => {
                const isExpanded = state.kanbanExpandedSections.includes(status);
                return {
                    kanbanExpandedSections: isExpanded
                        ? state.kanbanExpandedSections.filter((s) => s !== status)
                        : [...state.kanbanExpandedSections, status],
                };
            }),

        initKanbanSections: (statusesWithItems) => {
            // Only initialize if the kanban sections haven't been set yet
            // (i.e., the user hasn't interacted with the kanban view)
            const current = get().kanbanExpandedSections;
            if (current.length === 0) {
                // Default: expand sections that have items
                set({ kanbanExpandedSections: [...statusesWithItems] });
            }
        },
    }),
    persistOptions: {
        partialize: (state) => ({
            typeFilter: state.typeFilter,
            viewFilter: state.viewFilter,
            viewMode: state.viewMode,
            collapsedSections: state.collapsedSections,
            kanbanExpandedSections: state.kanbanExpandedSections,
        }),
    },
});
