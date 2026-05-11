/**
 * Todo-specific React Query hooks
 *
 * Cache config lives in `src/client/query/defaults.ts`; offline handling is
 * abstracted at the apiClient level.
 *
 * Mutations use `useOptimisticMutation` from `@/client/query` which bakes in
 * the optimistic-only pattern: cancel + snapshot + rollback + defensive
 * invalidate + errorToast on failure. See docs/template/react-query-mutations.md
 * and docs/template/use-optimistic-mutation.md.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTodos, getTodo, createTodo, updateTodo, deleteTodo } from '@/apis/project/todos/client';
import { useQueryDefaults, useOptimisticMutation } from '@/client/query';
import { generateId } from '@/client/utils/id';
import type {
    GetTodosResponse,
    GetTodoResponse,
    UpdateTodoRequest,
    DeleteTodoRequest,
} from '@/apis/project/todos/types';
import type { TodoItemClient } from '@/server/database/collections/project/todos/types';

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
 * USE CASE: NON-OPTIMISTIC operations only (external updates from websockets,
 * polling, manual refresh). Do NOT call from a mutation's `onSettled` — use
 * `useOptimisticMutation` for optimistic flows; it handles invalidation as a
 * defensive safety net inside `onError`.
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

type CreateTodoVars = CreateTodoInput & { _id: string };

/**
 * Hook for creating a new todo.
 *
 * Uses client-generated ID via `generateId()` so the optimistic item matches
 * the persisted item without a temp-ID swap.
 */
export function useCreateTodo() {
    return useOptimisticMutation<TodoItemClient | undefined, CreateTodoVars>({
        mutationFn: async (data) => {
            const response = await createTodo(data);
            if (response.data?.error) throw new Error(response.data.error);
            return response.data?.todo;
        },
        affectedKeys: [todosQueryKey],
        applyOptimistic: (vars, queryClient) => {
            const now = new Date().toISOString();
            const optimisticTodo: TodoItemClient = {
                _id: vars._id,
                userId: '',
                title: vars.title,
                completed: false,
                dueDate: vars.dueDate,
                createdAt: now,
                updatedAt: now,
            };
            queryClient.setQueryData<GetTodosResponse>(todosQueryKey, (old) => {
                if (!old?.todos) return { todos: [optimisticTodo] };
                return { todos: [...old.todos, optimisticTodo] };
            });
        },
        errorMessage: 'Failed to create todo',
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
    return useOptimisticMutation<TodoItemClient | undefined, UpdateTodoRequest>({
        mutationFn: async (data) => {
            const response = await updateTodo(data);
            if (response.data?.error) throw new Error(response.data.error);
            return response.data?.todo;
        },
        affectedKeys: (vars) => [todosQueryKey, todoQueryKey(vars.todoId)],
        applyOptimistic: (vars, queryClient) => {
            const updates: Partial<TodoItemClient> = {
                updatedAt: new Date().toISOString(),
            };
            if (vars.title !== undefined) updates.title = vars.title;
            if (vars.completed !== undefined) updates.completed = vars.completed;
            if (vars.dueDate !== undefined) {
                updates.dueDate = vars.dueDate === null ? undefined : vars.dueDate;
            }

            queryClient.setQueryData<GetTodosResponse>(todosQueryKey, (old) => {
                if (!old?.todos) return old;
                return {
                    todos: old.todos.map((todo) =>
                        todo._id === vars.todoId ? { ...todo, ...updates } : todo,
                    ),
                };
            });

            queryClient.setQueryData<GetTodoResponse>(todoQueryKey(vars.todoId), (old) => {
                if (!old?.todo) return old;
                return { todo: { ...old.todo, ...updates } };
            });
        },
        errorMessage: 'Failed to update todo',
    });
}

/**
 * Hook for deleting a todo
 */
export function useDeleteTodo() {
    return useOptimisticMutation<string, DeleteTodoRequest>({
        mutationFn: async (data) => {
            const response = await deleteTodo(data);
            if (response.data?.error) throw new Error(response.data.error);
            return data.todoId;
        },
        affectedKeys: (vars) => [todosQueryKey, todoQueryKey(vars.todoId)],
        applyOptimistic: (vars, queryClient) => {
            queryClient.setQueryData<GetTodosResponse>(todosQueryKey, (old) => {
                if (!old?.todos) return old;
                return { todos: old.todos.filter((todo) => todo._id !== vars.todoId) };
            });
            queryClient.setQueryData<GetTodoResponse>(todoQueryKey(vars.todoId), undefined);
        },
        errorMessage: 'Failed to delete todo',
    });
}
