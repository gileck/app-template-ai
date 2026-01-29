/**
 * Todos Page Component
 *
 * Benefits:
 * - Instant load from localStorage cache on app restart
 * - Background revalidation for fresh data
 * - Optimistic updates via mutations
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/client/components/ui/button';
import { Alert } from '@/client/components/ui/alert';
import { LinearProgress } from '@/client/components/ui/linear-progress';
import { RefreshCcw, Loader2 } from 'lucide-react';
import { useTodos, useDeleteTodo } from './hooks';
import type { TodoItemClient } from '@/server/database/collections/todos/types';
import { logger } from '@/client/features/session-logs';
import { TodoItem } from './components/TodoItem';
import { CreateTodoForm } from './components/CreateTodoForm';
import { DeleteTodoDialog } from './components/DeleteTodoDialog';
import { TodoStats } from './components/TodoStats';
import { EmptyState } from './components/EmptyState';
import { TodoControls } from './components/TodoControls';
import { useTodoPreferencesStore } from './store';
import { sortTodos, filterTodos, groupUncompletedFirst, filterTodosByDueDate } from './utils';

export function Todos() {
    // React Query hooks - cache is guaranteed to be restored at this point
    // (handled globally by QueryProvider's WaitForCacheRestore)
    const { data, isLoading, isFetching, error, refetch } = useTodos();
    const deleteTodoMutation = useDeleteTodo();

    // Local UI state - ephemeral form/dialog state that doesn't need persistence
    // eslint-disable-next-line state-management/prefer-state-architecture -- local error display cleared on next action
    const [actionError, setActionError] = useState<string>('');
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral dialog state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral dialog context
    const [todoToDelete, setTodoToDelete] = useState<TodoItemClient | null>(null);
    // eslint-disable-next-line state-management/prefer-state-architecture -- track which todo is being mutated
    const [mutatingTodoId, setMutatingTodoId] = useState<string | null>(null);

    const todos = data?.todos || [];

    // Get preferences from store
    const sortBy = useTodoPreferencesStore((state) => state.sortBy);
    const uncompletedFirst = useTodoPreferencesStore((state) => state.uncompletedFirst);
    const hideCompleted = useTodoPreferencesStore((state) => state.hideCompleted);
    const dueDateFilter = useTodoPreferencesStore((state) => state.dueDateFilter);

    // Compute filtered/sorted list with useMemo
    const displayTodos = useMemo(() => {
        let result = todos;

        // Apply hide completed filter
        result = filterTodos(result, hideCompleted);

        // Apply due date filter
        result = filterTodosByDueDate(result, dueDateFilter);

        // Apply sort
        result = sortTodos(result, sortBy);

        // Apply uncompleted first grouping
        if (uncompletedFirst) {
            result = groupUncompletedFirst(result);
        }

        return result;
    }, [todos, sortBy, uncompletedFirst, hideCompleted, dueDateFilter]);

    // Log page view on mount
    useEffect(() => {
        logger.info('todos', 'Todos page viewed', {
            meta: { todoCount: todos.length }
        });
    }, []);

    // Show loading only if fetching with no cached data
    // Cache restoration is handled globally by QueryProvider
    if (isLoading && !data) {
        return (
            <div className="w-full py-4">
                <LinearProgress />
                <p className="mt-2 text-center text-sm text-muted-foreground">Loading your todos...</p>
            </div>
        );
    }

    const handleDeleteTodo = (todo: TodoItemClient) => {
        logger.info('todos', 'Delete confirmation opened', {
            meta: { todoId: todo._id, title: todo.title }
        });
        setTodoToDelete(todo);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (!todoToDelete) return;

        const todoId = todoToDelete._id;
        const title = todoToDelete.title;

        logger.info('todos', 'Deleting todo', { meta: { todoId, title } });

        setActionError('');
        setMutatingTodoId(todoId);
        setDeleteConfirmOpen(false);
        setTodoToDelete(null);

        deleteTodoMutation.mutate(
            { todoId },
            {
                onSettled: () => setMutatingTodoId(null),
                onSuccess: () => {
                    logger.info('todos', 'Todo deleted successfully', { meta: { todoId, title } });
                },
                onError: (err) => {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to delete todo';
                    logger.error('todos', 'Failed to delete todo', {
                        meta: { todoId, error: errorMessage }
                    });
                    setActionError(errorMessage);
                },
            }
        );
    };

    const handleRefresh = () => {
        logger.info('todos', 'Manual refresh triggered', { meta: { currentCount: todos.length } });
        refetch();
    };

    const handleCancelDelete = () => {
        if (todoToDelete) {
            logger.info('todos', 'Delete cancelled', {
                meta: { todoId: todoToDelete._id, title: todoToDelete.title }
            });
        }
        setDeleteConfirmOpen(false);
    };

    const displayError = (error instanceof Error ? error.message : null) || actionError;

    // Calculate uncompleted and completed todos for divider
    const uncompletedTodos = displayTodos.filter(t => !t.completed);
    const completedTodos = displayTodos.filter(t => t.completed);
    const showDivider = uncompletedFirst && !hideCompleted && uncompletedTodos.length > 0 && completedTodos.length > 0;

    return (
        <div className="mx-auto max-w-3xl p-4 sm:p-6 todo-gradient-bg min-h-screen">
            {/* Header with gradient text */}
            {/* Desktop Header */}
            <div className="mb-5 hidden sm:flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-bold todo-gradient-text">My Todos</h1>
                    {/* Background refresh indicator - shows when fetching with existing data */}
                    {isFetching && !isLoading && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Updating...</span>
                        </div>
                    )}
                </div>
                <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>
                    <RefreshCcw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
                </Button>
            </div>

            {/* Mobile Header - Title left, icon-only refresh button right */}
            <div className="mb-5 flex sm:hidden items-center justify-between todo-mobile-header">
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold todo-gradient-text">My Todos</h1>
                    {/* Background refresh indicator - shows when fetching with existing data */}
                    {isFetching && !isLoading && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isFetching}
                    className="h-12 w-12 flex-shrink-0"
                    aria-label="Refresh todos"
                >
                    <RefreshCcw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {displayError && (
                <Alert variant="destructive" className="mb-5 animate-shake">{displayError}</Alert>
            )}

            {/* Statistics Panel - only show if there are todos */}
            {todos.length > 0 && <TodoStats todos={todos} />}

            {/* Add new todo */}
            <CreateTodoForm onError={setActionError} />

            {/* Todo Controls - sort and filter */}
            {todos.length > 0 && <TodoControls />}

            {/* Todos list */}
            {!data ? (
                <div className="py-8 text-center">
                    <p className="text-muted-foreground">Unable to load todos</p>
                </div>
            ) : todos.length === 0 ? (
                <EmptyState />
            ) : displayTodos.length === 0 ? (
                <div className="py-8 text-center">
                    {dueDateFilter === 'today' ? (
                        <>
                            <p className="text-2xl mb-2">📅</p>
                            <p className="text-muted-foreground">No todos due today! You&apos;re all caught up.</p>
                        </>
                    ) : dueDateFilter === 'overdue' ? (
                        <>
                            <p className="text-2xl mb-2">✅</p>
                            <p className="text-muted-foreground">No overdue todos. Great job staying on top of things!</p>
                        </>
                    ) : dueDateFilter === 'week' ? (
                        <>
                            <p className="text-2xl mb-2">📆</p>
                            <p className="text-muted-foreground">No todos due this week.</p>
                        </>
                    ) : dueDateFilter === 'none' ? (
                        <>
                            <p className="text-2xl mb-2">📋</p>
                            <p className="text-muted-foreground">No todos without due dates.</p>
                        </>
                    ) : (
                        <>
                            <p className="text-2xl mb-2">🎉</p>
                            <p className="text-muted-foreground">No uncompleted todos. Great work!</p>
                        </>
                    )}
                </div>
            ) : showDivider ? (
                <div className="todo-list-container">
                    {/* Uncompleted todos */}
                    {uncompletedTodos.map((todo) => (
                        <div key={todo._id} className="todo-item-stagger">
                            <TodoItem
                                todo={todo}
                                mutatingTodoId={mutatingTodoId}
                                setMutatingTodoId={setMutatingTodoId}
                                onError={setActionError}
                                onDelete={handleDeleteTodo}
                            />
                        </div>
                    ))}

                    {/* Divider */}
                    <div className="todo-completed-divider">
                        <span className="todo-completed-divider-text">
                            Completed – {completedTodos.length}
                        </span>
                    </div>

                    {/* Completed todos */}
                    {completedTodos.map((todo) => (
                        <div key={todo._id} className="todo-item-stagger">
                            <TodoItem
                                todo={todo}
                                mutatingTodoId={mutatingTodoId}
                                setMutatingTodoId={setMutatingTodoId}
                                onError={setActionError}
                                onDelete={handleDeleteTodo}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="todo-list-container">
                    {displayTodos.map((todo) => (
                        <div key={todo._id} className="todo-item-stagger">
                            <TodoItem
                                todo={todo}
                                mutatingTodoId={mutatingTodoId}
                                setMutatingTodoId={setMutatingTodoId}
                                onError={setActionError}
                                onDelete={handleDeleteTodo}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Delete confirmation dialog */}
            <DeleteTodoDialog
                open={deleteConfirmOpen}
                todo={todoToDelete}
                onConfirm={confirmDelete}
                onCancel={handleCancelDelete}
            />
        </div>
    );
}
