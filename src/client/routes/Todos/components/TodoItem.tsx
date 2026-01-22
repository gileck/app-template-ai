/**
 * Todo Item Component
 */

import { useState } from 'react';
import { Button } from '@/client/components/ui/button';
import { Input } from '@/client/components/ui/input';
import { CheckSquare, Eye, Save, X, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from '@/client/router';
import { useUpdateTodo } from '../hooks';
import type { TodoItemClient } from '@/server/database/collections/todos/types';
import { logger } from '@/client/features/session-logs';

interface TodoItemProps {
    todo: TodoItemClient;
    mutatingTodoId: string | null;
    setMutatingTodoId: (id: string | null) => void;
    onError: (message: string) => void;
    onDelete: (todo: TodoItemClient) => void;
}

export function TodoItem({
    todo,
    mutatingTodoId,
    setMutatingTodoId,
    onError,
    onDelete,
}: TodoItemProps) {
    const { navigate } = useRouter();
    const updateTodoMutation = useUpdateTodo();

    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral inline edit state
    const [isEditing, setIsEditing] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral inline edit state
    const [editTitle, setEditTitle] = useState('');

    const handleToggleComplete = async () => {
        const newCompletedState = !todo.completed;
        logger.info('todos', `Toggling todo completion`, {
            meta: { todoId: todo._id, title: todo.title, completed: newCompletedState }
        });

        setMutatingTodoId(todo._id);

        updateTodoMutation.mutate(
            { todoId: todo._id, completed: newCompletedState },
            {
                onSettled: () => setMutatingTodoId(null),
                onSuccess: () => {
                    logger.info('todos', `Todo marked as ${newCompletedState ? 'completed' : 'incomplete'}`, {
                        meta: { todoId: todo._id, title: todo.title }
                    });
                },
                onError: (err) => {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to update todo';
                    logger.error('todos', 'Failed to toggle todo completion', {
                        meta: { todoId: todo._id, error: errorMessage }
                    });
                    onError(errorMessage);
                },
            }
        );
    };

    const handleStartEdit = () => {
        logger.info('todos', 'Started editing todo', {
            meta: { todoId: todo._id, title: todo.title }
        });
        setIsEditing(true);
        setEditTitle(todo.title);
    };

    const handleSaveEdit = async () => {
        if (!editTitle.trim()) {
            logger.warn('todos', 'Save edit attempted with empty title');
            onError('Please enter a valid title');
            return;
        }

        const oldTitle = todo.title;
        const newTitle = editTitle.trim();

        logger.info('todos', 'Saving todo edit', {
            meta: { todoId: todo._id, oldTitle, newTitle }
        });

        setMutatingTodoId(todo._id);
        setIsEditing(false);
        setEditTitle('');

        updateTodoMutation.mutate(
            { todoId: todo._id, title: newTitle },
            {
                onSettled: () => setMutatingTodoId(null),
                onSuccess: () => {
                    logger.info('todos', 'Todo title updated', {
                        meta: { todoId: todo._id, oldTitle, newTitle }
                    });
                },
                onError: (err) => {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to update todo';
                    logger.error('todos', 'Failed to update todo title', {
                        meta: { todoId: todo._id, error: errorMessage }
                    });
                    onError(errorMessage);
                },
            }
        );
    };

    const handleCancelEdit = () => {
        logger.info('todos', 'Cancelled editing todo', {
            meta: { todoId: todo._id }
        });
        setIsEditing(false);
        setEditTitle('');
    };

    const handleViewTodo = () => {
        logger.info('todos', 'Navigating to todo detail', {
            meta: { todoId: todo._id, title: todo.title }
        });
        navigate(`/todos/${todo._id}`);
    };

    const handleEditKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    return (
        <li
            className={`mb-1 flex items-center gap-2 rounded p-2 transition-all duration-300 ease-out ${todo.completed ? 'opacity-70 bg-accent' : ''}`}
        >
            <button
                className="h-5 w-5 rounded border transition-all duration-200"
                aria-checked={todo.completed}
                role="checkbox"
                onClick={handleToggleComplete}
                disabled={mutatingTodoId === todo._id}
            >
                {todo.completed ? <CheckSquare className="h-4 w-4 transition-opacity duration-200" /> : null}
            </button>

            {isEditing ? (
                <Input
                    className="flex-1"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyPress={handleEditKeyPress}
                    disabled={mutatingTodoId === todo._id}
                    autoFocus
                />
            ) : (
                <span className={`flex-1 transition-all duration-200 ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {todo.title}
                </span>
            )}

            {isEditing ? (
                <div className="flex gap-1">
                    <Button variant="secondary" size="sm" onClick={handleSaveEdit} disabled={mutatingTodoId === todo._id}>
                        <Save className="mr-1 h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        <X className="mr-1 h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={handleViewTodo}>
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleStartEdit} disabled={mutatingTodoId === todo._id}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(todo)} disabled={mutatingTodoId === todo._id}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            )}
        </li>
    );
}
