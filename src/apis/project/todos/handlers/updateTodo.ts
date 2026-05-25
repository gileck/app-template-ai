import { API_UPDATE_TODO } from '../index';
import { ApiHandlerContext, UpdateTodoRequest, UpdateTodoResponse } from '../types';
import { todos } from '@/server/database';
import { toStringId } from '@/server/template/utils';
import { sendTelegramNotificationToUser } from '@/server/template/telegram';
import { z } from 'zod';
import { defineApiMeta } from '@/apis/types';

export const apiMeta = defineApiMeta<UpdateTodoRequest>()({
    description:
        "Update a todo by id. Provide at least one of title, completed, or dueDate. Use this to mark a todo done (completed: true) or undone (completed: false).",
    inputSchema: {
        todoId: z
            .string()
            .describe('The todo id, as returned by list-todos in the `_id` field.'),
        title: z
            .string()
            .min(1)
            .optional()
            .describe('Optional. New title; must be non-empty when provided.'),
        completed: z
            .boolean()
            .optional()
            .describe(
                'Optional. true marks the todo as done, false marks it as not done.'
            ),
        dueDate: z
            .string()
            .nullable()
            .optional()
            .describe(
                'Optional. ISO-8601 due date, or null to clear an existing due date.'
            ),
    },
    agentExposed: true,
    mutates: true,
});

export const updateTodo = async (
    request: UpdateTodoRequest,
    context: ApiHandlerContext
): Promise<UpdateTodoResponse> => {
    try {
        if (!context.userId) {
            return { error: "Not authenticated" };
        }

        if (!request.todoId) {
            return { error: "Todo ID is required" };
        }

        if (!request.title && request.completed === undefined && request.dueDate === undefined) {
            return { error: "No update data provided" };
        }

        // Prepare update data
        const updateData: {
            updatedAt: Date;
            title?: string;
            completed?: boolean;
            dueDate?: Date;
        } = {
            updatedAt: new Date()
        };

        if (request.title !== undefined) {
            if (request.title.trim() === '') {
                return { error: "Title cannot be empty" };
            }
            updateData.title = request.title.trim();
        }

        if (request.completed !== undefined) {
            updateData.completed = request.completed;
        }

        if (request.dueDate !== undefined) {
            if (request.dueDate === null) {
                updateData.dueDate = undefined;
            } else {
                const parsedDate = new Date(request.dueDate);
                if (isNaN(parsedDate.getTime())) {
                    return { error: "Invalid due date format" };
                }
                updateData.dueDate = parsedDate;
            }
        }

        const updatedTodo = await todos.updateTodo(request.todoId, context.userId, updateData);

        if (!updatedTodo) {
            return { error: "Todo not found" };
        }

        // Send Telegram notification when todo is marked as done
        if (request.completed === true) {
            await sendTelegramNotificationToUser(context.userId, `Todo completed: ${updatedTodo.title}`);
        }

        // Convert to client format
        const todoClient = {
            _id: toStringId(updatedTodo._id),
            userId: toStringId(updatedTodo.userId),
            title: updatedTodo.title,
            completed: updatedTodo.completed,
            dueDate: updatedTodo.dueDate?.toISOString(),
            createdAt: updatedTodo.createdAt.toISOString(),
            updatedAt: updatedTodo.updatedAt.toISOString()
        };

        return { todo: todoClient };
    } catch (error: unknown) {
        console.error("Update todo error:", error);
        return { error: error instanceof Error ? error.message : "Failed to update todo" };
    }
};

export { API_UPDATE_TODO }; 