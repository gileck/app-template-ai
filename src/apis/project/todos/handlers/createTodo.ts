import { API_CREATE_TODO } from '../index';
import { ApiHandlerContext, CreateTodoRequest, CreateTodoResponse } from '../types';
import { todos } from '@/server/database';
import { ObjectId } from 'mongodb';
import { toDocumentId, toStringId, toQueryId } from '@/server/template/utils';
import { z } from 'zod';
import { defineApiMeta } from '@/apis/types';

export const apiMeta = defineApiMeta<CreateTodoRequest>()({
    description:
        "Create a new todo for the current user. Returns the created todo.",
    // Intentionally omits `_id`. The underlying handler accepts it for
    // client-side idempotent retries (offline mutation queue), but the
    // agent has no concept of retrying with a stable ID — surfacing it
    // would just let the model fabricate IDs that collide with future
    // client-generated ones.
    inputSchema: {
        title: z
            .string()
            .min(1)
            .describe('The todo title. Required, must be non-empty.'),
        dueDate: z
            .string()
            .optional()
            .describe(
                'Optional ISO-8601 due date (e.g. "2026-06-01T15:00:00Z"). Omit if no due date.'
            ),
    },
    agentExposed: true,
    mutates: true,
});

export const createTodo = async (
    request: CreateTodoRequest,
    context: ApiHandlerContext
): Promise<CreateTodoResponse> => {
    try {
        if (!context.userId) {
            return { error: "Not authenticated" };
        }

        if (!request.title || request.title.trim() === '') {
            return { error: "Title is required" };
        }

        // Validate due date if provided
        if (request.dueDate) {
            const parsedDate = new Date(request.dueDate);
            if (isNaN(parsedDate.getTime())) {
                return { error: "Invalid due date format" };
            }
        }

        // If client provided an ID, check for idempotency (handle retries)
        if (request._id) {
            const existing = await todos.findTodoById(request._id, context.userId);
            if (existing) {
                // Return existing todo (idempotent - same ID = same result)
                return {
                    todo: {
                        _id: toStringId(existing._id),
                        userId: toStringId(existing.userId),
                        title: existing.title,
                        completed: existing.completed,
                        dueDate: existing.dueDate?.toISOString(),
                        createdAt: existing.createdAt.toISOString(),
                        updatedAt: existing.updatedAt.toISOString()
                    }
                };
            }
        }

        const now = new Date();
        const todoData = {
            // Use client-provided ID (UUID or ObjectId format) or generate new one
            _id: request._id ? toDocumentId(request._id) : new ObjectId(),
            userId: toQueryId(context.userId) as ObjectId,
            title: request.title.trim(),
            completed: false,
            dueDate: request.dueDate ? new Date(request.dueDate) : undefined,
            createdAt: now,
            updatedAt: now
        };

        const newTodo = await todos.createTodoWithId(todoData);

        // Convert to client format
        const todoClient = {
            _id: toStringId(newTodo._id),
            userId: toStringId(newTodo.userId),
            title: newTodo.title,
            completed: newTodo.completed,
            dueDate: newTodo.dueDate?.toISOString(),
            createdAt: newTodo.createdAt.toISOString(),
            updatedAt: newTodo.updatedAt.toISOString()
        };

        return { todo: todoClient };
    } catch (error: unknown) {
        console.error("Create todo error:", error);
        return { error: error instanceof Error ? error.message : "Failed to create todo" };
    }
};

export { API_CREATE_TODO }; 