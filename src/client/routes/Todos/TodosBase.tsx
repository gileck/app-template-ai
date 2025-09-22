import React, { useEffect, useState } from 'react';
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
    const [actionLoading] = useState(false);
    const [actionError, setActionError] = useState<string>('');
    const [editingTodo, setEditingTodo] = useState<TodoItemClient | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [todoToDelete, setTodoToDelete] = useState<TodoItemClient | null>(null);
    const { navigate } = useRouter();

    // Local offline-first todos state (persisted)
    const [localTodos, setLocalTodos] = useState<TodoItemClient[]>([]);
    const STORAGE_KEY = 'todos_local_state_v1';

    // Initialize local state from localStorage or server response
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setLocalTodos(parsed);
                    return;
                }
            }
        } catch { /* ignore */ }
        setLocalTodos(todosResponse?.todos || []);
    }, []);

    // Persist local state
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(localTodos));
        } catch { /* ignore */ }
    }, [localTodos]);

    const handleCreateTodo = async () => {
        if (!newTodoTitle.trim()) {
            setActionError('Please enter a todo title');
            return;
        }

        setActionError('');
        const tempId = `temp-${Date.now()}`;
        const optimistic = { _id: tempId, title: newTodoTitle.trim(), completed: false } as unknown as TodoItemClient;
        setLocalTodos(prev => [...prev, optimistic]);
        setNewTodoTitle('');

        // Fire-and-forget server sync
        createTodo({ title: optimistic.title }).then(result => {
            if (result.data?.todo && result.data.todo._id) {
                setLocalTodos(prev => prev.map(t => t._id === tempId ? { ...result.data!.todo } as unknown as TodoItemClient : t));
            } else if (result.data?.error) {
                setActionError(result.data.error);
                // Optionally revert
                setLocalTodos(prev => prev.filter(t => t._id !== tempId));
            }
        }).catch(err => {
            // If queued offline, keep optimistic item; otherwise revert and show error
            const isQueued = err instanceof Error && err.message === 'REQUEST_QUEUED_OFFLINE';
            if (!isQueued) {
                setActionError('Failed to create todo');
            }
        });
    };

    const handleToggleComplete = async (todo: TodoItemClient) => {
        setActionError('');
        const updatedCompleted = !todo.completed;
        // Optimistic update
        setLocalTodos(prev => prev.map(t => t._id === todo._id ? { ...t, completed: updatedCompleted } : t));

        // Background sync
        updateTodo({ todoId: todo._id, completed: updatedCompleted })
            .then(result => {
                if (result.data?.error) {
                    setActionError(result.data.error);
                    // Revert on server error
                    setLocalTodos(prev => prev.map(t => t._id === todo._id ? { ...t, completed: !updatedCompleted } : t));
                } else if (result.data?.todo) {
                    // Align with server response
                    const next = result.data.todo as unknown as TodoItemClient;
                    setLocalTodos(prev => prev.map(t => t._id === todo._id ? next : t));
                }
            })
            .catch(err => {
                const isQueued = err instanceof Error && err.message === 'REQUEST_QUEUED_OFFLINE';
                if (!isQueued) {
                    setActionError('Failed to update todo');
                    // Revert
                    setLocalTodos(prev => prev.map(t => t._id === todo._id ? { ...t, completed: !updatedCompleted } : t));
                }
            });
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

        setActionError('');
        const originalTitle = editingTodo.title;
        const todoId = editingTodo._id;
        // Optimistic update
        setLocalTodos(prev => prev.map(t => t._id === todoId ? { ...t, title: editTitle.trim() } : t));
        setEditingTodo(null);
        setEditTitle('');

        // Background sync
        updateTodo({ todoId, title: editTitle.trim() })
            .then(result => {
                if (result.data?.error) {
                    setActionError(result.data.error);
                    // Revert
                    setLocalTodos(prev => prev.map(t => t._id === todoId ? { ...t, title: originalTitle } : t));
                } else if (result.data?.todo) {
                    const next = result.data.todo as unknown as TodoItemClient;
                    setLocalTodos(prev => prev.map(t => t._id === todoId ? next : t));
                }
            })
            .catch(err => {
                const isQueued = err instanceof Error && err.message === 'REQUEST_QUEUED_OFFLINE';
                if (!isQueued) {
                    setActionError('Failed to update todo');
                    // Revert
                    setLocalTodos(prev => prev.map(t => t._id === todoId ? { ...t, title: originalTitle } : t));
                }
            });
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

        setActionError('');
        const removedId = todoToDelete._id;
        const removed = todoToDelete;
        // Optimistic remove
        setLocalTodos(prev => prev.filter(t => t._id !== removedId));
        setDeleteConfirmOpen(false);
        setTodoToDelete(null);

        // Background sync
        deleteTodo({ todoId: removedId })
            .then(result => {
                if (result.data?.error || result.data?.success === false) {
                    setActionError(result.data?.error || 'Failed to delete todo');
                    // Revert
                    setLocalTodos(prev => [removed, ...prev]);
                }
            })
            .catch(err => {
                const isQueued = err instanceof Error && err.message === 'REQUEST_QUEUED_OFFLINE';
                if (!isQueued) {
                    setActionError('Failed to delete todo');
                    // Revert
                    setLocalTodos(prev => [removed, ...prev]);
                }
            });
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
                {isLoading && localTodos.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : localTodos.length === 0 ? (
                    <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        No todos yet. Add one above!
                    </Typography>
                ) : (
                    <List>
                        {localTodos.map((todo, index) => (
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
                                                    disabled={actionLoading || String(todo._id).startsWith('temp-')}
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
                                {index < localTodos.length - 1 && <Divider />}
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