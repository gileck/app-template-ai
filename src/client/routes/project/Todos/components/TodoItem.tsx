/**
 * Todo Item Component
 */

import { useState, useRef } from 'react';
import { Button } from '@/client/components/template/ui/button';
import { Input } from '@/client/components/template/ui/input';
import { Card } from '@/client/components/template/ui/card';
import { Badge } from '@/client/components/template/ui/badge';
import { Eye, Save, X, Pencil, Trash2, Check, Calendar } from 'lucide-react';
import { useRouter } from '@/client/features';
import { useUpdateTodo } from '../hooks';
import type { TodoItemClient } from '@/server/database/collections/todos/types';
import { logger } from '@/client/features';
import { toast } from '@/client/components/template/ui/toast';
import { CelebrationEffect } from './CelebrationEffect';
import { prefersReducedMotion } from '../animations';
import { DatePickerDialog } from './DatePickerDialog';
import { formatDueDate, isToday, isOverdue } from '../utils/dateUtils';

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
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral dialog state
    const [datePickerOpen, setDatePickerOpen] = useState(false);

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
                        // Check if it was overdue
                        const wasOverdue = todo.dueDate && isOverdue(todo.dueDate);
                        const message = wasOverdue
                            ? `Better late than never! 🎉`
                            : `🎉 Great job completing "${todo.title}"!`;
                        toast.success(message);

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

    const handleDateSelect = (date: Date | undefined) => {
        const newDueDate = date?.toISOString() || null;

        setMutatingTodoId(todo._id);

        updateTodoMutation.mutate(
            { todoId: todo._id, dueDate: newDueDate },
            {
                onSettled: () => setMutatingTodoId(null),
                onSuccess: () => {
                    logger.info('todos', 'Todo due date updated', {
                        meta: { todoId: todo._id, dueDate: newDueDate }
                    });
                },
                onError: (err) => {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to update due date';
                    logger.error('todos', 'Failed to update due date', {
                        meta: { todoId: todo._id, error: errorMessage }
                    });
                    onError(errorMessage);
                },
            }
        );
    };

    const isDisabled = mutatingTodoId === todo._id;

    // Determine visual styling based on due date
    const isDueDateToday = todo.dueDate && isToday(todo.dueDate);
    const isDueDateOverdue = todo.dueDate && !todo.completed && isOverdue(todo.dueDate);

    // Border color for visual priority
    let borderColorClass = '';
    if (isDueDateOverdue) {
        borderColorClass = 'border-l-4 border-l-destructive';
    } else if (isDueDateToday) {
        borderColorClass = 'border-l-4 border-l-primary';
    }

    return (
        <>
            <Card
                ref={cardRef}
                className={`todo-item-card ${todo.completed ? 'todo-success-gradient' : ''} ${isDisabled ? 'opacity-60' : ''} ${borderColorClass}`}
            >
                {/* Desktop Layout */}
                <div className="hidden sm:flex flex-col gap-2">
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
                                className={`todo-item-title text-base ${
                                    todo.completed ? 'todo-completed-text' : ''
                                }`}
                                title={todo.title}
                            >
                                {todo.title}
                            </span>
                        )}

                        {/* Action Buttons */}
                        {isEditing ? (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDatePickerOpen(true)}
                                    title="Set due date"
                                >
                                    <Calendar className="h-4 w-4" />
                                </Button>
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
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleViewTodo}
                                    title="View details"
                                    className="todo-action-button"
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleStartEdit}
                                    disabled={isDisabled}
                                    title="Edit"
                                    className="todo-action-button"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDelete(todo)}
                                    disabled={isDisabled}
                                    title="Delete"
                                    className="todo-action-button"
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Due Date Badge */}
                    {todo.dueDate && (
                        <div className="flex items-center gap-2 ml-11">
                            <Badge
                                variant={isDueDateOverdue ? 'destructive' : isDueDateToday ? 'default' : 'secondary'}
                                className="text-xs"
                            >
                                <Calendar className="mr-1 h-3 w-3" />
                                {isDueDateToday ? 'Today' : isDueDateOverdue ? `Overdue - ${formatDueDate(todo.dueDate)}` : `Due ${formatDueDate(todo.dueDate)}`}
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Mobile Layout */}
                <div className="flex flex-col gap-2 sm:hidden">
                    {/* Row 1: Checkbox + Title */}
                    <div className="flex items-start gap-2">
                        {/* Custom Checkbox - touch-friendly with minimal visual gap */}
                        <button
                            className={`todo-checkbox-mobile ${todo.completed ? 'checked' : ''}`}
                            aria-checked={todo.completed}
                            role="checkbox"
                            onClick={handleToggleComplete}
                            disabled={isDisabled}
                            aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                            {todo.completed && <Check className="h-4 w-4" />}
                        </button>

                        {/* Title or Edit Input */}
                        <div className="flex-1 min-w-0 pt-1">
                            {isEditing ? (
                                <Input
                                    className="h-12 text-base"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onKeyDown={handleEditKeyPress}
                                    disabled={isDisabled}
                                    autoFocus
                                />
                            ) : (
                                <span
                                    className={`todo-item-title-mobile text-base leading-snug ${
                                        todo.completed ? 'todo-completed-text-mobile' : ''
                                    }`}
                                >
                                    {todo.title}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Due Date Badge (if applicable) */}
                    {todo.dueDate && !isEditing && (
                        <div className="ml-8">
                            <Badge
                                variant={isDueDateOverdue ? 'destructive' : isDueDateToday ? 'default' : 'secondary'}
                                className="text-xs px-2 py-0.5"
                            >
                                <Calendar className="mr-1 h-3 w-3" />
                                {isDueDateToday ? 'Today' : isDueDateOverdue ? `Overdue - ${formatDueDate(todo.dueDate)}` : `Due ${formatDueDate(todo.dueDate)}`}
                            </Badge>
                        </div>
                    )}

                    {/* Row 3: Action Buttons */}
                    {isEditing ? (
                        <div className="flex flex-col gap-2 ml-8">
                            <Button
                                variant="outline"
                                onClick={() => setDatePickerOpen(true)}
                                title="Set due date"
                                className="w-full h-11"
                            >
                                <Calendar className="mr-2 h-4 w-4" />
                                Set Due Date
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    variant="default"
                                    onClick={handleSaveEdit}
                                    disabled={isDisabled}
                                    className="flex-1 h-11"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    Save
                                </Button>
                                <Button variant="outline" onClick={handleCancelEdit} className="flex-1 h-11">
                                    <X className="mr-2 h-4 w-4" />
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2 ml-8">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleViewTodo}
                                title="View details"
                                className="h-9 flex-1 text-xs"
                            >
                                <Eye className="mr-1 h-3.5 w-3.5" />
                                View
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleStartEdit}
                                disabled={isDisabled}
                                title="Edit"
                                className="h-9 flex-1 text-xs"
                            >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Edit
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDelete(todo)}
                                disabled={isDisabled}
                                title="Delete"
                                className="h-9 w-9 flex-shrink-0 px-0"
                            >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            <DatePickerDialog
                open={datePickerOpen}
                onOpenChange={setDatePickerOpen}
                selectedDate={todo.dueDate ? new Date(todo.dueDate) : undefined}
                onDateSelect={handleDateSelect}
            />

            {/* Celebration Effect */}
            <CelebrationEffect
                active={celebrating}
                onComplete={() => setCelebrating(false)}
            />
        </>
    );
}
