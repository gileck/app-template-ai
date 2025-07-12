import apiClient from '@/client/utils/apiClient';
import { CacheResult } from '@/common/cache/types';
import { ApiOptions } from '@/client/utils/apiClient';
import { API_GET_TODOS, API_GET_TODO, API_CREATE_TODO, API_UPDATE_TODO, API_DELETE_TODO } from './index';
import {
    GetTodosRequest,
    GetTodosResponse,
    GetTodoRequest,
    GetTodoResponse,
    CreateTodoRequest,
    CreateTodoResponse,
    UpdateTodoRequest,
    UpdateTodoResponse,
    DeleteTodoRequest,
    DeleteTodoResponse
} from './types';

/**
 * Get all todos for the current user
 */
export const getTodos = async (
    params: GetTodosRequest = {},
    options?: ApiOptions
): Promise<CacheResult<GetTodosResponse>> => {
    return apiClient.call(API_GET_TODOS, params, options);
};

/**
 * Get a single todo by ID
 */
export const getTodo = async (
    params: GetTodoRequest,
    options?: ApiOptions
): Promise<CacheResult<GetTodoResponse>> => {
    return apiClient.call(API_GET_TODO, params, options);
};

/**
 * Create a new todo
 */
export const createTodo = async (
    params: CreateTodoRequest
): Promise<CacheResult<CreateTodoResponse>> => {
    return apiClient.call(API_CREATE_TODO, params);
};

/**
 * Update an existing todo
 */
export const updateTodo = async (
    params: UpdateTodoRequest
): Promise<CacheResult<UpdateTodoResponse>> => {
    return apiClient.call(API_UPDATE_TODO, params);
};

/**
 * Delete a todo
 */
export const deleteTodo = async (
    params: DeleteTodoRequest
): Promise<CacheResult<DeleteTodoResponse>> => {
    return apiClient.call(API_DELETE_TODO, params);
}; 