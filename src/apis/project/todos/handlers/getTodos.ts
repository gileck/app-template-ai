import { API_GET_TODOS } from '../index';
import { ApiHandlerContext, GetTodosRequest, GetTodosResponse } from '../types';
import { todos } from '@/server/database';
import { toStringId } from '@/server/template/utils';
import { defineApiMeta } from '@/apis/types';

/**
 * Agent-surface metadata. Co-located so it can't drift from the
 * handler. `defineApiMeta<TRequest>()` enforces at compile time that
 * the Zod inputSchema matches the handler's request type.
 */
export const apiMeta = defineApiMeta<GetTodosRequest>()({
    description: "List all of the current user's todos.",
    inputSchema: {}, // no parameters — uses userId from the context
    agentExposed: true,
    mutates: false,
});

export const getTodos = async (
    _: GetTodosRequest,
    context: ApiHandlerContext
): Promise<GetTodosResponse> => {
    try {
        if (!context.userId) {
            return { error: "Not authenticated" };
        }

        const todoList = await todos.findTodosByUserId(context.userId);

        // Convert to client format
        const todosClient = todoList.map(todo => ({
            _id: toStringId(todo._id),
            userId: toStringId(todo.userId),
            title: todo.title,
            completed: todo.completed,
            createdAt: todo.createdAt.toISOString(),
            updatedAt: todo.updatedAt.toISOString()
        }));

        return { todos: todosClient };
    } catch (error: unknown) {
        console.error("Get todos error:", error);
        return { error: error instanceof Error ? error.message : "Failed to get todos" };
    }
};

export { API_GET_TODOS }; 