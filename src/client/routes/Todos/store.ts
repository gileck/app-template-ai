/**
 * Todo Preferences Store
 *
 * Manages user preferences for todo list sorting and filtering.
 * Preferences persist across sessions via localStorage.
 */

import { createStore } from '@/client/stores';

/**
 * Sort order options for todos
 */
export type TodoSortBy = 'newest' | 'oldest' | 'updated' | 'title-asc' | 'title-desc' | 'due-earliest' | 'due-latest';

/**
 * Due date filter options
 */
export type TodoDueDateFilter = 'all' | 'today' | 'week' | 'overdue' | 'none';

/**
 * Todo preferences state interface
 */
interface TodoPreferencesState {
    sortBy: TodoSortBy;
    uncompletedFirst: boolean;
    hideCompleted: boolean;
    dueDateFilter: TodoDueDateFilter;
    setSortBy: (sortBy: TodoSortBy) => void;
    setUncompletedFirst: (value: boolean) => void;
    setHideCompleted: (value: boolean) => void;
    setDueDateFilter: (filter: TodoDueDateFilter) => void;
}

/**
 * Todo Preferences store - persists sort/filter preferences across sessions
 */
export const useTodoPreferencesStore = createStore<TodoPreferencesState>({
    key: 'todo-preferences',
    label: 'Todo Preferences',
    creator: (set) => ({
        sortBy: 'newest',
        uncompletedFirst: false,
        hideCompleted: false,
        dueDateFilter: 'all',
        setSortBy: (sortBy) => set({ sortBy }),
        setUncompletedFirst: (value) => set({ uncompletedFirst: value }),
        setHideCompleted: (value) => set({ hideCompleted: value }),
        setDueDateFilter: (filter) => set({ dueDateFilter: filter }),
    }),
    persistOptions: {
        partialize: (state) => ({
            sortBy: state.sortBy,
            uncompletedFirst: state.uncompletedFirst,
            hideCompleted: state.hideCompleted,
            dueDateFilter: state.dueDateFilter,
        }),
    },
});
