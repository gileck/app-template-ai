/**
 * Todos Page Component
 *
 * Benefits:
 * - Instant load from localStorage cache on app restart
 * - Background revalidation for fresh data
 * - Optimistic updates via mutations
 */

import React, { useState, useEffect } from 'react';
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

    return (
        <div className="mx-auto max-w-3xl p-4 todo-gradient-bg min-h-screen">
            {/* Header with gradient text */}
            <div className="mb-6 flex items-center justify-between">
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
                <Button variant="outline" onClick={handleRefresh} disabled={isFetching} className="transition-transform hover:scale-105">
                    <RefreshCcw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
                </Button>
            </div>

            {displayError && (
                <Alert variant="destructive" className="mb-4 animate-shake">{displayError}</Alert>
            )}

            {/* Statistics Panel - only show if there are todos */}
            {todos.length > 0 && <TodoStats todos={todos} />}

            {/* Add new todo */}
            <CreateTodoForm onError={setActionError} />

            {/* Todos list */}
            {!data ? (
                <div className="py-8 text-center">
                    <p className="text-muted-foreground">Unable to load todos</p>
                </div>
            ) : todos.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="todo-list-container">
                    {todos.map((todo) => (
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
