/**
 * Todo Item Component
 */

import { useState, useRef } from 'react';
import { Button } from '@/client/components/ui/button';
import { Input } from '@/client/components/ui/input';
import { Card } from '@/client/components/ui/card';
import { Eye, Save, X, Pencil, Trash2, Check } from 'lucide-react';
import { useRouter } from '@/client/router';
import { useUpdateTodo } from '../hooks';
import type { TodoItemClient } from '@/server/database/collections/todos/types';
import { logger } from '@/client/features/session-logs';
import { toast } from '@/client/components/ui/toast';
import { CelebrationEffect } from './CelebrationEffect';
import { prefersReducedMotion } from '../animations';

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
    const cardRef = useRef<HTMLDivElement>(null);

    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral inline edit state
    const [isEditing, setIsEditing] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral inline edit state
    const [editTitle, setEditTitle] = useState('');
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral celebration state
    const [celebrating, setCelebrating] = useState(false);

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

                    // Trigger celebration if completing (not uncompleting)
                    if (newCompletedState && !prefersReducedMotion()) {
                        setCelebrating(true);
                        toast.success(`🎉 Great job completing "${todo.title}"!`);

                        // Add bounce animation to card
                        if (cardRef.current) {
                            cardRef.current.classList.add('todo-celebration-bounce');
                            setTimeout(() => {
                                cardRef.current?.classList.remove('todo-celebration-bounce');
                            }, 600);
                        }
                    }
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

    const isDisabled = mutatingTodoId === todo._id;

    return (
        <>
            <Card
                ref={cardRef}
                className={`todo-item-card ${todo.completed ? 'todo-success-gradient' : ''} ${isDisabled ? 'opacity-60' : ''}`}
            >
                <div className="flex items-center gap-3">
                    {/* Custom Checkbox */}
                    <button
                        className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
                        aria-checked={todo.completed}
                        role="checkbox"
                        onClick={handleToggleComplete}
                        disabled={isDisabled}
                        aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                        {todo.completed && <Check className="h-4 w-4" />}
                    </button>

                    {/* Title or Edit Input */}
                    {isEditing ? (
                        <Input
                            className="flex-1"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={handleEditKeyPress}
                            disabled={isDisabled}
                            autoFocus
                        />
                    ) : (
                        <span
                            className={`flex-1 text-base ${
                                todo.completed ? 'todo-completed-text' : ''
                            }`}
                        >
                            {todo.title}
                        </span>
                    )}

                    {/* Action Buttons */}
                    {isEditing ? (
                        <div className="flex gap-2">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleSaveEdit}
                                disabled={isDisabled}
                            >
                                <Save className="mr-1 h-4 w-4" />
                                Save
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                                <X className="mr-1 h-4 w-4" />
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleViewTodo}
                                title="View details"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleStartEdit}
                                disabled={isDisabled}
                                title="Edit"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(todo)}
                                disabled={isDisabled}
                                title="Delete"
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Celebration Effect */}
            <CelebrationEffect
                active={celebrating}
                onComplete={() => setCelebrating(false)}
            />
        </>
    );
}
