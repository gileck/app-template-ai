import React, { useEffect, useState } from 'react';
import { Button } from '@/client/components/ui/button';
import { Input } from '@/client/components/ui/input';
import { Alert } from '@/client/components/ui/alert';
import { LinearProgress } from '@/client/components/ui/linear-progress';
import { Card } from '@/client/components/ui/card';
import { Separator } from '@/client/components/ui/separator';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/client/components/ui/dialog';
import { CheckSquare, Eye, Plus, RefreshCcw, Save, X, Pencil, Trash2 } from 'lucide-react';
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
        <div className="mx-auto max-w-3xl p-3">
            <div className="mb-3 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">My Todos</h1>
                <Button variant="outline" onClick={refresh} disabled={isLoading}>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                </Button>
            </div>

            {displayError && (
                <Alert variant="destructive" className="mb-2">{displayError}</Alert>
            )}

            {/* Add new todo */}
            <Card className="mb-3 p-2">
                <div className="flex items-center gap-2">
                    <Input
                        value={newTodoTitle}
                        onChange={(e) => setNewTodoTitle(e.target.value)}
                        placeholder="Enter a new todo..."
                        onKeyPress={handleKeyPress}
                        disabled={actionLoading}
                    />
                    <Button onClick={handleCreateTodo} disabled={actionLoading || !newTodoTitle.trim()}>
                        <Plus className="mr-2 h-4 w-4" /> Add
                    </Button>
                    {actionLoading && <div className="w-24"><LinearProgress className="mt-1" /></div>}
                </div>
            </Card>

            {/* Todos list */}
            <Card className="p-2">
                {isLoading && localTodos.length === 0 ? (
                    <div className="py-2"><LinearProgress /></div>
                ) : localTodos.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No todos yet. Add one above!</p>
                ) : (
                    <ul>
                        {localTodos.map((todo, index) => (
                            <React.Fragment key={todo._id}>
                                <li
                                    className={`mb-1 flex items-center gap-2 rounded p-2 ${todo.completed ? 'opacity-70 bg-accent' : ''}`}
                                >
                                    <button
                                        className="h-5 w-5 rounded border"
                                        aria-checked={todo.completed}
                                        role="checkbox"
                                        onClick={() => handleToggleComplete(todo)}
                                        disabled={actionLoading}
                                    >
                                        {todo.completed ? <CheckSquare className="h-4 w-4" /> : null}
                                    </button>

                                    {editingTodo?._id === todo._id ? (
                                        <Input
                                            className="flex-1"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            onKeyPress={handleEditKeyPress}
                                            disabled={actionLoading}
                                            autoFocus
                                        />
                                    ) : (
                                        <span className={`flex-1 ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                                            {todo.title}
                                        </span>
                                    )}

                                    {editingTodo?._id === todo._id ? (
                                        <div className="flex gap-1">
                                            <Button variant="secondary" size="sm" onClick={handleSaveEdit} disabled={actionLoading}>
                                                <Save className="mr-1 h-4 w-4" />
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={actionLoading}>
                                                <X className="mr-1 h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => handleViewTodo(todo)} disabled={actionLoading || String(todo._id).startsWith('temp-')}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleStartEdit(todo)} disabled={actionLoading}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteTodo(todo)} disabled={actionLoading}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    )}
                                </li>
                                {index < localTodos.length - 1 && <Separator />}
                            </React.Fragment>
                        ))}
                    </ul>
                )}
            </Card>

            {/* Delete confirmation dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Todo</DialogTitle>
                    </DialogHeader>
                    <p>Are you sure you want to delete &quot;{todoToDelete?.title}&quot;?</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} autoFocus>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}; 