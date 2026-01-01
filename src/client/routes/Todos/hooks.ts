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
import type {
    GetTodosResponse,
    GetTodoResponse,
    CreateTodoRequest,
    UpdateTodoRequest,
    DeleteTodoRequest,
} from '@/apis/todos/types';

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
 * Hook for creating a new todo
 */
export function useCreateTodo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateTodoRequest) => {
            const response = await createTodo(data);
            if (response.data?.error) {
                throw new Error(response.data.error);
            }
            return response.data?.todo;
        },
        // Creates:
        // - We do NOT use temp IDs and replace flows.
        // - Todos are stored with server-generated IDs (MongoDB ObjectId), so this create is NOT optimistic.
        // - On success, we insert the server-returned todo into the list cache.
        // - When offline, apiClient queues the request and returns {}, so newTodo will be undefined here.
        onSuccess: (newTodo) => {
            if (!newTodo) return;
            queryClient.setQueryData<GetTodosResponse>(todosQueryKey, (old) => {
                if (!old?.todos) return { todos: [newTodo] };
                return { todos: [...old.todos, newTodo] };
            });
        },
    });
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
                return {
                    todos: old.todos.map((todo) =>
                        todo._id === variables.todoId
                            ? { ...todo, ...variables, updatedAt: new Date().toISOString() }
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
