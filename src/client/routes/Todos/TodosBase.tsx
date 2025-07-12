import React, { useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Checkbox,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Paper,
    Divider,
    CircularProgress
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Refresh as RefreshIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import { createTodo, updateTodo, deleteTodo } from '@/apis/todos/client';
import { TodoItemClient } from '@/server/database/collections/todos/types';
import { GetTodosResponse } from '@/apis/todos/types';
import { useRouter } from '../../router';

interface TodosBaseProps {
    todos: GetTodosResponse;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

export const TodosBase: React.FC<TodosBaseProps> = ({
    todos: todosResponse,
    isLoading,
    error: fetchError,
    refresh
}) => {
    const [newTodoTitle, setNewTodoTitle] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string>('');
    const [editingTodo, setEditingTodo] = useState<TodoItemClient | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [todoToDelete, setTodoToDelete] = useState<TodoItemClient | null>(null);
    const { navigate } = useRouter();

    // Extract todos from response
    const todos = todosResponse?.todos || [];

    const handleCreateTodo = async () => {
        if (!newTodoTitle.trim()) {
            setActionError('Please enter a todo title');
            return;
        }

        setActionLoading(true);
        setActionError('');
        try {
            const result = await createTodo({ title: newTodoTitle });
            if (result.data?.error) {
                setActionError(result.data.error);
            } else if (result.data?.todo) {
                setNewTodoTitle('');
                refresh(); // Refresh the data
            }
        } catch (err) {
            console.error('Failed to create todo:', err);
            setActionError('Failed to create todo');
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleComplete = async (todo: TodoItemClient) => {
        setActionLoading(true);
        setActionError('');
        try {
            const result = await updateTodo({
                todoId: todo._id,
                completed: !todo.completed
            });
            if (result.data?.error) {
                setActionError(result.data.error);
            } else if (result.data?.todo) {
                refresh(); // Refresh the data
            }
        } catch (err) {
            console.error('Failed to update todo:', err);
            setActionError('Failed to update todo');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartEdit = (todo: TodoItemClient) => {
        setEditingTodo(todo);
        setEditTitle(todo.title);
    };

    const handleSaveEdit = async () => {
        if (!editingTodo || !editTitle.trim()) {
            setActionError('Please enter a valid title');
            return;
        }

        setActionLoading(true);
        setActionError('');
        try {
            const result = await updateTodo({
                todoId: editingTodo._id,
                title: editTitle
            });
            if (result.data?.error) {
                setActionError(result.data.error);
            } else if (result.data?.todo) {
                setEditingTodo(null);
                setEditTitle('');
                refresh(); // Refresh the data
            }
        } catch (err) {
            console.error('Failed to update todo:', err);
            setActionError('Failed to update todo');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingTodo(null);
        setEditTitle('');
    };

    const handleDeleteTodo = async (todo: TodoItemClient) => {
        setTodoToDelete(todo);
        setDeleteConfirmOpen(true);
    };

    const handleViewTodo = (todo: TodoItemClient) => {
        navigate(`/todos/${todo._id}?todoId=${todo._id}`);
    };

    const confirmDelete = async () => {
        if (!todoToDelete) return;

        setActionLoading(true);
        setActionError('');
        try {
            const result = await deleteTodo({ todoId: todoToDelete._id });
            if (result.data?.error) {
                setActionError(result.data.error);
            } else if (result.data?.success) {
                setDeleteConfirmOpen(false);
                setTodoToDelete(null);
                refresh(); // Refresh the data
            }
        } catch (err) {
            console.error('Failed to delete todo:', err);
            setActionError('Failed to delete todo');
        } finally {
            setActionLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCreateTodo();
        }
    };

    const handleEditKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    const displayError = fetchError || actionError;

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    My Todos
                </Typography>
                <Button
                    variant="outlined"
                    onClick={refresh}
                    startIcon={<RefreshIcon />}
                    disabled={isLoading}
                >
                    Refresh
                </Button>
            </Box>

            {displayError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {displayError}
                </Alert>
            )}

            {/* Add new todo */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                        fullWidth
                        value={newTodoTitle}
                        onChange={(e) => setNewTodoTitle(e.target.value)}
                        placeholder="Enter a new todo..."
                        onKeyPress={handleKeyPress}
                        disabled={actionLoading}
                    />
                    <Button
                        variant="contained"
                        onClick={handleCreateTodo}
                        disabled={actionLoading || !newTodoTitle.trim()}
                        startIcon={actionLoading ? <CircularProgress size={16} /> : <AddIcon />}
                    >
                        Add
                    </Button>
                </Box>
            </Paper>

            {/* Todos list */}
            <Paper sx={{ p: 2 }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : todos.length === 0 ? (
                    <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        No todos yet. Add one above!
                    </Typography>
                ) : (
                    <List>
                        {todos.map((todo, index) => (
                            <React.Fragment key={todo._id}>
                                <ListItem
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        opacity: todo.completed ? 0.7 : 1,
                                        bgcolor: todo.completed ? 'action.hover' : 'transparent',
                                        borderRadius: 1,
                                        mb: 1
                                    }}
                                >
                                    <Checkbox
                                        checked={todo.completed}
                                        onChange={() => handleToggleComplete(todo)}
                                        disabled={actionLoading}
                                    />

                                    {editingTodo?._id === todo._id ? (
                                        <TextField
                                            fullWidth
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            onKeyPress={handleEditKeyPress}
                                            disabled={actionLoading}
                                            autoFocus
                                        />
                                    ) : (
                                        <ListItemText
                                            primary={todo.title}
                                            sx={{
                                                textDecoration: todo.completed ? 'line-through' : 'none',
                                                color: todo.completed ? 'text.secondary' : 'text.primary'
                                            }}
                                        />
                                    )}

                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        {editingTodo?._id === todo._id ? (
                                            <>
                                                <IconButton
                                                    onClick={handleSaveEdit}
                                                    disabled={actionLoading}
                                                    size="small"
                                                    color="primary"
                                                >
                                                    <SaveIcon />
                                                </IconButton>
                                                <IconButton
                                                    onClick={handleCancelEdit}
                                                    disabled={actionLoading}
                                                    size="small"
                                                    color="secondary"
                                                >
                                                    <CancelIcon />
                                                </IconButton>
                                            </>
                                        ) : (
                                            <>
                                                <IconButton
                                                    onClick={() => handleViewTodo(todo)}
                                                    disabled={actionLoading}
                                                    size="small"
                                                    color="info"
                                                >
                                                    <VisibilityIcon />
                                                </IconButton>
                                                <IconButton
                                                    onClick={() => handleStartEdit(todo)}
                                                    disabled={actionLoading}
                                                    size="small"
                                                    color="primary"
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    onClick={() => handleDeleteTodo(todo)}
                                                    disabled={actionLoading}
                                                    size="small"
                                                    color="error"
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </>
                                        )}
                                    </Box>
                                </ListItem>
                                {index < todos.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </Paper>

            {/* Delete confirmation dialog */}
            <Dialog
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
            >
                <DialogTitle>Delete Todo</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete &quot;{todoToDelete?.title}&quot;?
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={confirmDelete} color="error" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}; 