/**
 * Todo List Utilities
 *
 * Pure functions for sorting and filtering todo arrays.
 * All functions return new arrays without mutating the input.
 */

import type { TodoItemClient } from '@/server/database/collections/todos/types';
import type { TodoSortBy, TodoDueDateFilter } from './store';
import { isToday, isDueThisWeek, isOverdue } from './utils/dateUtils';

/**
 * Sort todos by the specified criteria
 *
 * @param todos - Array of todos to sort
 * @param sortBy - Sort criteria
 * @returns New sorted array
 */
export function sortTodos(
    todos: TodoItemClient[],
    sortBy: TodoSortBy
): TodoItemClient[] {
    const sorted = [...todos];

    switch (sortBy) {
        case 'newest':
            return sorted.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        case 'oldest':
            return sorted.sort((a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
        case 'updated':
            return sorted.sort((a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
        case 'title-asc':
            return sorted.sort((a, b) => a.title.localeCompare(b.title));
        case 'title-desc':
            return sorted.sort((a, b) => b.title.localeCompare(a.title));
        case 'due-earliest':
            return sorted.sort((a, b) => {
                // Todos without due dates go to the end
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            });
        case 'due-latest':
            return sorted.sort((a, b) => {
                // Todos without due dates go to the end
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
            });
        default:
            return sorted;
    }
}

/**
 * Filter todos by completion status
 *
 * @param todos - Array of todos to filter
 * @param hideCompleted - Whether to hide completed todos
 * @returns New filtered array
 */
export function filterTodos(
    todos: TodoItemClient[],
    hideCompleted: boolean
): TodoItemClient[] {
    if (hideCompleted) {
        return todos.filter(todo => !todo.completed);
    }
    return todos;
}

/**
 * Group todos with uncompleted items first
 *
 * @param todos - Array of todos to group
 * @returns New array with uncompleted todos first, then completed
 */
export function groupUncompletedFirst(
    todos: TodoItemClient[]
): TodoItemClient[] {
    const uncompleted = todos.filter(todo => !todo.completed);
    const completed = todos.filter(todo => todo.completed);
    return [...uncompleted, ...completed];
}

/**
 * Filter todos by due date
 *
 * @param todos - Array of todos to filter
 * @param dueDateFilter - Due date filter criteria
 * @returns New filtered array
 */
export function filterTodosByDueDate(
    todos: TodoItemClient[],
    dueDateFilter: TodoDueDateFilter
): TodoItemClient[] {
    switch (dueDateFilter) {
        case 'all':
            return todos;
        case 'today':
            return todos.filter(todo => isToday(todo.dueDate));
        case 'week':
            return todos.filter(todo => isDueThisWeek(todo.dueDate));
        case 'overdue':
            // Overdue filter excludes completed todos
            return todos.filter(todo => !todo.completed && isOverdue(todo.dueDate));
        case 'none':
            return todos.filter(todo => !todo.dueDate);
        default:
            return todos;
    }
}
