/**
 * Todo List Utilities
 *
 * Pure functions for sorting and filtering todo arrays.
 * All functions return new arrays without mutating the input.
 */

import type { TodoItemClient } from '@/server/database/collections/todos/types';
import type { TodoSortBy } from './store';

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
