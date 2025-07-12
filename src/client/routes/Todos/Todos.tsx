import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { DataFetcherWrapper } from '@/client/utils/DataFetcherWrapper';
import { getTodos } from '@/apis/todos/client';
import { TodosBase } from './TodosBase';

// Custom loader for todos
const TodosLoader = () => (
    <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8
    }}>
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading your todos...
        </Typography>
    </Box>
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