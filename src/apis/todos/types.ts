import { TodoItemClient } from '@/server/database/collections/todos/types';

// Get todos
export interface GetTodosRequest {
    // No parameters needed - uses userId from context
    _?: never;
}

export interface GetTodosResponse {
    todos?: TodoItemClient[];
    error?: string;
}

// Get single todo
export interface GetTodoRequest {
    todoId: string;
}

export interface GetTodoResponse {
    todo?: TodoItemClient;
    error?: string;
}

// Create todo
export interface CreateTodoRequest {
    /** Client-generated ID (UUID). If provided, server will use this ID. */
    _id?: string;
    title: string;
    dueDate?: string;
}

export interface CreateTodoResponse {
    todo?: TodoItemClient;
    error?: string;
}

// Update todo
export interface UpdateTodoRequest {
    todoId: string;
    title?: string;
    completed?: boolean;
    dueDate?: string | null;
}

export interface UpdateTodoResponse {
    todo?: TodoItemClient;
    error?: string;
}

// Delete todo
export interface DeleteTodoRequest {
    todoId: string;
}

export interface DeleteTodoResponse {
    success?: boolean;
    error?: string;
}

export interface ApiHandlerContext {
    userId?: string;
} 