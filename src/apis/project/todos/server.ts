// Must re-export all exports from index.ts
export * from './index';

// Import API name constants from index.ts
import { API_GET_TODOS, API_GET_TODO, API_CREATE_TODO, API_UPDATE_TODO, API_DELETE_TODO } from './index';

// Import handlers (+ co-located agent metadata where present)
import { getTodos, apiMeta as getTodosMeta } from './handlers/getTodos';
import { getTodo, apiMeta as getTodoMeta } from './handlers/getTodo';
import { createTodo, apiMeta as createTodoMeta } from './handlers/createTodo';
import { updateTodo, apiMeta as updateTodoMeta } from './handlers/updateTodo';
import { deleteTodo } from './handlers/deleteTodo';

// Export consolidated handlers object. Entries MAY include `meta` to
// opt into the agent tool surface (see `buildAgentToolsFromApis`).
export const todosApiHandlers = {
    [API_GET_TODOS]: { process: getTodos, meta: getTodosMeta },
    [API_GET_TODO]: { process: getTodo, meta: getTodoMeta },
    [API_CREATE_TODO]: { process: createTodo, meta: createTodoMeta },
    [API_UPDATE_TODO]: { process: updateTodo, meta: updateTodoMeta },
    [API_DELETE_TODO]: { process: deleteTodo }
}; 