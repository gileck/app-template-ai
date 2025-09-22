import React from 'react';
import { LinearProgress } from '@/client/components/ui/linear-progress';
import { DataFetcherWrapper } from '@/client/utils/DataFetcherWrapper';
import { getTodos } from '@/apis/todos/client';
import { TodosBase } from './TodosBase';

// Custom loader for todos
const TodosLoader = () => (
    <div className="w-full py-4">
        <LinearProgress />
        <p className="mt-2 text-center text-sm text-muted-foreground">Loading your todos...</p>
    </div>
);

// Create the wrapped component using DataFetcherWrapper with custom loader
export const Todos = DataFetcherWrapper(
    { todos: () => getTodos() },
    TodosBase,
    {
        loader: TodosLoader,
        showGlobalError: true,
        enableRefresh: true,
        customRefreshFetchers: {
            todos: () => getTodos({}, { bypassCache: true })
        }
    }
); 