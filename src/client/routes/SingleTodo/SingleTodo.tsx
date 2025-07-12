import React from 'react';
import { Box, Typography, Card, CardContent, Chip, Button, IconButton } from '@mui/material';
import { ArrowBack, Edit, Delete, Check, Close } from '@mui/icons-material';
import { useRouter } from '../../router';
import { DataFetcherWrapper } from '../../utils/DataFetcherWrapper';
import { getTodo } from '../../../apis/todos/client';
import { GetTodoResponse } from '../../../apis/todos/types';

interface SingleTodoBaseProps {
    todo: GetTodoResponse;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

const SingleTodoBase: React.FC<SingleTodoBaseProps> = ({ todo, error }) => {
    const { navigate } = useRouter();

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="error">{error}</Typography>
                <Button onClick={() => navigate('/todos')}>Back to Todos</Button>
            </Box>
        );
    }

    if (!todo.todo) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Todo not found</Typography>
                <Button onClick={() => navigate('/todos')}>Back to Todos</Button>
            </Box>
        );
    }

    const todoItem = todo.todo;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <IconButton onClick={() => navigate('/todos')} sx={{ mr: 2 }}>
                    <ArrowBack />
                </IconButton>
                <Typography variant="h4">Todo Details</Typography>
            </Box>

            <Card sx={{ maxWidth: 600 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h5" component="h2">
                            {todoItem.title}
                        </Typography>
                        <Chip
                            label={todoItem.completed ? 'Completed' : 'Pending'}
                            color={todoItem.completed ? 'success' : 'warning'}
                            icon={todoItem.completed ? <Check /> : <Close />}
                        />
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Created: {new Date(todoItem.createdAt).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Updated: {new Date(todoItem.updatedAt).toLocaleDateString()}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<Edit />}
                            onClick={() => navigate(`/todos?edit=${todoItem._id}`)}
                        >
                            Edit
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Delete />}
                            onClick={() => {
                                // TODO: Add delete functionality
                                console.log('Delete todo:', todoItem._id);
                            }}
                        >
                            Delete
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

const SingleTodo = DataFetcherWrapper(
    {
        todo: (queryParams: Record<string, string>) => getTodo({ todoId: queryParams.todoId })
    },
    SingleTodoBase
);

export default SingleTodo; 