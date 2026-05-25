import { API_GET_TODO } from '../index';
import { ApiHandlerContext, GetTodoRequest, GetTodoResponse } from '../types';
import { todos } from '@/server/database';
import { toStringId } from '@/server/template/utils';
import { z } from 'zod';
import { defineApiMeta } from '@/apis/types';

export const apiMeta = defineApiMeta<GetTodoRequest>()({
    description: 'Get a single todo by its id.',
    inputSchema: {
        todoId: z
            .string()
            .describe('The todo id, as returned by list-todos in the `_id` field.'),
    },
    agentExposed: true,
    mutates: false,
});

export const getTodo = async (
    request: GetTodoRequest,
    context: ApiHandlerContext
): Promise<GetTodoResponse> => {
    try {
        if (!context.userId) {
            return { error: "Not authenticated" };
        }

        if (!request.todoId) {
            return { error: "Todo ID is required" };
        }

        const todo = await todos.findTodoById(request.todoId, context.userId);

        if (!todo) {
            return { error: "Todo not found" };
        }

        // Convert to client format
        const todoClient = {
            _id: toStringId(todo._id),
            userId: toStringId(todo.userId),
            title: todo.title,
            completed: todo.completed,
            createdAt: todo.createdAt.toISOString(),
            updatedAt: todo.updatedAt.toISOString()
        };

        return { todo: todoClient };
    } catch (error: unknown) {
        console.error("Get todo error:", error);
        return { error: error instanceof Error ? error.message : "Failed to get todo" };
    }
};

export { API_GET_TODO }; 