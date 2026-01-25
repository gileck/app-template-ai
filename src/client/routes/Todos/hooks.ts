/**
 * Todo-specific React Query hooks
 * 
 * These hooks are SIMPLE - no cache config here.
 * - Cache config lives in `src/client/query/defaults.ts`
 * - Offline handling is abstracted at the apiClient level
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getTodos, getTodo, createTodo, updateTodo, deleteTodo } from '@/apis/todos/client';
import { useQueryDefaults } from '@/client/query/defaults';
import { generateId } from '@/client/utils/id';
import type {
    GetTodosResponse,
    GetTodoResponse,
    UpdateTodoRequest,
    DeleteTodoRequest,
} from '@/apis/todos/types';
import type { TodoItemClient } from '@/server/database/collections/todos/types';

// ============================================================================
// Query Keys
// ============================================================================

export const todosQueryKey = ['todos'] as const;
export const todoQueryKey = (todoId: string) => ['todos', todoId] as const;

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch all todos for the current user
 */
export function useTodos(options?: { enabled?: boolean }) {
    const queryDefaults = useQueryDefaults();

    return useQuery({
        queryKey: todosQueryKey,
        queryFn: async (): Promise<GetTodosResponse> => {
            const response = await getTodos({});
            if (response.data?.error) {
                throw new Error(response.data.error);
            }
            return response.data;
        },
        enabled: options?.enabled ?? true,
        ...queryDefaults,
    });
}

/**
 * Hook to fetch a single todo by ID
 */
export function useTodo(todoId: string, options?: { enabled?: boolean }) {
    const queryDefaults = useQueryDefaults();

    return useQuery({
        queryKey: todoQueryKey(todoId),
        queryFn: async (): Promise<GetTodoResponse> => {
            const response = await getTodo({ todoId });
            if (response.data?.error) {
                throw new Error(response.data.error);
            }
            return response.data;
        },
        enabled: (options?.enabled ?? true) && !!todoId,
        ...queryDefaults,
    });
}

/**
 * Hook to invalidate todos queries
 *
 * ⚠️ USE CASE: This is for NON-OPTIMISTIC operations only:
 * - External updates (websocket events, polling)
 * - Bulk operations where optimistic update is impractical
 * - Manual refresh triggers
 *
 * ❌ DO NOT use in mutation `onSettled` handlers for optimistic updates
 * (see docs/react-query-mutations.md for optimistic-only pattern)
 */
export function useInvalidateTodos() {
    const queryClient = useQueryClient();

    return {
        invalidateAll: () => queryClient.invalidateQueries({ queryKey: todosQueryKey }),
        invalidateOne: (todoId: string) => queryClient.invalidateQueries({ queryKey: todoQueryKey(todoId) }),
    };
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Input for creating a todo (without _id - we generate it)
 */
export interface CreateTodoInput {
    title: string;
    dueDate?: string;
}

/**
 * Hook for creating a new todo
 * 
 * Uses OPTIMISTIC CREATE with client-generated ID:
 * - Client generates UUID via generateId()
 * - Server accepts and persists this ID
 * - No temp-ID replacement needed
 * 
 * @see docs/react-query-mutations.md
 */
export function useCreateTodo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateTodoInput & { _id: string }) => {
            const response = await createTodo(data);
            if (response.data?.error) {
                throw new Error(response.data.error);
            }
            return response.data?.todo;
        },
        onMutate: async (variables) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: todosQueryKey });

            // Snapshot previous value for rollback
            const previousTodos = queryClient.getQueryData<GetTodosResponse>(todosQueryKey);

            // Optimistically add the new todo
            const now = new Date().toISOString();
            const optimisticTodo: TodoItemClient = {
                _id: variables._id,
                userId: '', // Will be set by server, not displayed
                title: variables.title,
                completed: false,
                dueDate: variables.dueDate,
                createdAt: now,
                updatedAt: now,
            };

            queryClient.setQueryData<GetTodosResponse>(todosQueryKey, (old) => {
                if (!old?.todos) return { todos: [optimisticTodo] };
                return { todos: [...old.todos, optimisticTodo] };
            });

            return { previousTodos };
        },
        onError: (_err, _variables, context) => {
            // Rollback on error
            if (context?.previousTodos) {
                queryClient.setQueryData(todosQueryKey, context.previousTodos);
            }
        },
        // Optimistic-only: never update from server response
        onSuccess: () => {},
        onSettled: () => {},
    });
}

/**
 * Mutation options for useCreateTodoWithId
 */
interface CreateTodoMutationOptions {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

/**
 * Helper to create a todo with a generated ID
 * Use this in components to get the correct mutation input
 */
export function useCreateTodoWithId() {
    const mutation = useCreateTodo();

    return {
        ...mutation,
        mutate: (data: CreateTodoInput, options?: CreateTodoMutationOptions) => {
            const _id = generateId();
            mutation.mutate({ ...data, _id }, options);
        },
        mutateAsync: async (data: CreateTodoInput) => {
            const _id = generateId();
            return mutation.mutateAsync({ ...data, _id });
        },
    };
}

/**
 * Hook for updating an existing todo
 */
export function useUpdateTodo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateTodoRequest) => {
            const response = await updateTodo(data);
            if (response.data?.error) {
                throw new Error(response.data.error);
            }
            return response.data?.todo;
        },
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: todosQueryKey });
            const previousTodos = queryClient.getQueryData<GetTodosResponse>(todosQueryKey);

            // Optimistic update
            queryClient.setQueryData<GetTodosResponse>(todosQueryKey, (old) => {
                if (!old?.todos) return old;

                // Build the update object with proper type handling for dueDate
                const updates: Partial<TodoItemClient> = {
                    updatedAt: new Date().toISOString(),
                };

                // Copy over defined fields, converting null to undefined for dueDate
                if (variables.title !== undefined) {
                    updates.title = variables.title;
                }
                if (variables.completed !== undefined) {
                    updates.completed = variables.completed;
                }
                if (variables.dueDate !== undefined) {
                    updates.dueDate = variables.dueDate === null ? undefined : variables.dueDate;
                }

                return {
                    todos: old.todos.map((todo) =>
                        todo._id === variables.todoId
                            ? { ...todo, ...updates }
                            : todo
                    ),
                };
            });

            return { previousTodos };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousTodos) {
                queryClient.setQueryData(todosQueryKey, context.previousTodos);
            }
        },
        // Optimistic-only: never update from server response
        onSuccess: () => {},
        onSettled: () => {},
    });
}

/**
 * Hook for deleting a todo
 */
export function useDeleteTodo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: DeleteTodoRequest) => {
            const response = await deleteTodo(data);
            if (response.data?.error) {
                throw new Error(response.data.error);
            }
            return data.todoId;
        },
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: todosQueryKey });
            const previousTodos = queryClient.getQueryData<GetTodosResponse>(todosQueryKey);

            // Optimistic update
            queryClient.setQueryData<GetTodosResponse>(todosQueryKey, (old) => {
                if (!old?.todos) return old;
                return {
                    todos: old.todos.filter((todo) => todo._id !== variables.todoId),
                };
            });

            return { previousTodos };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousTodos) {
                queryClient.setQueryData(todosQueryKey, context.previousTodos);
            }
        },
        // Optimistic-only: never update from server response
        onSuccess: () => {},
        onSettled: () => {},
    });
}
