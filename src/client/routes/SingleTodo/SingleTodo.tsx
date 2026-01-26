/**
 * Single Todo Page Component
 *
 * Rich, polished detail view for individual todos with inline editing,
 * celebration animations, and enhanced UX.
 */

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/client/components/ui/card';
import { Button } from '@/client/components/ui/button';
import { Badge } from '@/client/components/ui/badge';
import { LinearProgress } from '@/client/components/ui/linear-progress';
import { Input } from '@/client/components/ui/input';
import {
    ArrowLeft,
    Calendar,
    Clock,
    RefreshCw,
    Check,
    Trash2,
    Save,
    X
} from 'lucide-react';
import { useRouter } from '../../router';
import { useTodo, useUpdateTodo, useDeleteTodo } from '../Todos/hooks';
import { CelebrationEffect } from '../Todos/components/CelebrationEffect';
import { DatePickerDialog } from '../Todos/components/DatePickerDialog';
import { DeleteTodoDialog } from '../Todos/components/DeleteTodoDialog';
import { formatDueDate, isToday, isOverdue, formatRelativeTime } from '../Todos/utils/dateUtils';
import { toast } from '@/client/components/ui/toast';
import { prefersReducedMotion } from '../Todos/animations';
import { logger } from '@/client/features/session-logs';

const SingleTodo = () => {
    const { routeParams, navigate } = useRouter();
    const todoId = routeParams.todoId;

    // Local UI state - ephemeral form/dialog state
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral dialog state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral inline edit state
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral inline edit state
    const [editTitle, setEditTitle] = useState('');
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral celebration state
    const [celebrating, setCelebrating] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral dialog state
    const [datePickerOpen, setDatePickerOpen] = useState(false);

    const cardRef = useRef<HTMLDivElement>(null);

    const { data, isLoading, error } = useTodo(todoId || '');
    const updateTodoMutation = useUpdateTodo();
    const deleteTodoMutation = useDeleteTodo();

    // Loading state - only show on initial load
    if (isLoading && !data) {
        return (
            <div className="w-full py-4">
                <LinearProgress />
                <p className="mt-2 text-center text-sm text-muted-foreground">Loading todo...</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen todo-gradient-bg flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6">
                        <p className="text-2xl mb-2 text-center">⚠️</p>
                        <p className="text-center text-destructive mb-4">
                            {error instanceof Error ? error.message : 'An error occurred'}
                        </p>
                        <Button onClick={() => navigate('/todos')} className="w-full">
                            Back to Todos
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Not found state
    if (!data?.todo) {
        return (
            <div className="min-h-screen todo-gradient-bg flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6">
                        <p className="text-2xl mb-2 text-center">🔍</p>
                        <p className="text-center text-muted-foreground mb-2">
                            This todo doesn&apos;t exist or was deleted
                        </p>
                        <Button onClick={() => navigate('/todos')} className="w-full mt-4">
                            Back to Todos
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const todoItem = data.todo;

    // Determine visual styling based on due date
    const isDueDateToday = todoItem.dueDate && isToday(todoItem.dueDate);
    const isDueDateOverdue = todoItem.dueDate && !todoItem.completed && isOverdue(todoItem.dueDate);

    // Border color for visual priority
    let borderColorClass = '';
    if (isDueDateOverdue) {
        borderColorClass = 'border-l-4 border-l-destructive';
    } else if (isDueDateToday) {
        borderColorClass = 'border-l-4 border-l-primary';
    }

    // Handlers
    const handleToggleComplete = () => {
        const newCompletedState = !todoItem.completed;
        logger.info('todos', 'Toggling todo completion on detail page', {
            meta: { todoId: todoItem._id, completed: newCompletedState }
        });

        updateTodoMutation.mutate(
            { todoId: todoItem._id, completed: newCompletedState },
            {
                onSuccess: () => {
                    logger.info('todos', `Todo marked as ${newCompletedState ? 'completed' : 'incomplete'}`, {
                        meta: { todoId: todoItem._id }
                    });

                    // Trigger celebration if completing (not uncompleting)
                    if (newCompletedState && !prefersReducedMotion()) {
                        setCelebrating(true);
                        // Check if it was overdue
                        const wasOverdue = todoItem.dueDate && isOverdue(todoItem.dueDate);
                        const message = wasOverdue
                            ? 'Better late than never! 🎉'
                            : `🎉 Great job completing "${todoItem.title}"!`;
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
                    logger.error('todos', 'Failed to toggle completion', {
                        meta: { todoId: todoItem._id, error: errorMessage }
                    });
                    toast.error(errorMessage);
                },
            }
        );
    };

    const handleStartEdit = () => {
        logger.info('todos', 'Started editing todo title on detail page', {
            meta: { todoId: todoItem._id }
        });
        setIsEditingTitle(true);
        setEditTitle(todoItem.title);
    };

    const handleSaveEdit = () => {
        if (!editTitle.trim()) {
            toast.error('Please enter a valid title');
            return;
        }

        const newTitle = editTitle.trim();
        logger.info('todos', 'Saving todo title', {
            meta: { todoId: todoItem._id, newTitle }
        });

        setIsEditingTitle(false);
        setEditTitle('');

        updateTodoMutation.mutate(
            { todoId: todoItem._id, title: newTitle },
            {
                onSuccess: () => {
                    logger.info('todos', 'Todo title updated', {
                        meta: { todoId: todoItem._id }
                    });
                    toast.success('Title updated');
                },
                onError: (err) => {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to update title';
                    logger.error('todos', 'Failed to update title', {
                        meta: { todoId: todoItem._id, error: errorMessage }
                    });
                    toast.error(errorMessage);
                },
            }
        );
    };

    const handleCancelEdit = () => {
        logger.info('todos', 'Cancelled editing todo title', {
            meta: { todoId: todoItem._id }
        });
        setIsEditingTitle(false);
        setEditTitle('');
    };

    const handleDateSelect = (date: Date | undefined) => {
        const newDueDate = date?.toISOString() || null;

        updateTodoMutation.mutate(
            { todoId: todoItem._id, dueDate: newDueDate },
            {
                onSuccess: () => {
                    logger.info('todos', 'Due date updated', {
                        meta: { todoId: todoItem._id, dueDate: newDueDate }
                    });
                    toast.success('Due date updated');
                },
                onError: (err) => {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to update due date';
                    logger.error('todos', 'Failed to update due date', {
                        meta: { todoId: todoItem._id, error: errorMessage }
                    });
                    toast.error(errorMessage);
                },
            }
        );
    };

    const handleDelete = () => {
        logger.info('todos', 'Deleting todo from detail page', {
            meta: { todoId: todoItem._id }
        });

        deleteTodoMutation.mutate(
            { todoId: todoItem._id },
            {
                onSuccess: () => {
                    logger.info('todos', 'Todo deleted successfully', {
                        meta: { todoId: todoItem._id }
                    });
                    toast.success('Todo deleted');
                    navigate('/todos');
                },
                onError: (err) => {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to delete todo';
                    logger.error('todos', 'Failed to delete todo', {
                        meta: { todoId: todoItem._id, error: errorMessage }
                    });
                    toast.error(errorMessage);
                },
            }
        );
    };

    const isUpdating = updateTodoMutation.isPending;
    const isDeleting = deleteTodoMutation.isPending;

    // Character count for edit mode
    const titleCharCount = editTitle.length;
    const maxTitleLength = 200;

    return (
        <div className="min-h-screen todo-gradient-bg p-4 sm:p-6">
            <div className="mx-auto max-w-2xl">
                {/* Header Section */}
                <div className="mb-6">
                    {/* Desktop breadcrumb */}
                    <div className="hidden sm:flex items-center gap-2 mb-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/todos')}
                            className="hover:bg-muted/50"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Todos
                        </Button>
                    </div>

                    {/* Mobile back button */}
                    <div className="sm:hidden mb-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/todos')}
                            className="hover:bg-muted/50"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </div>

                    {/* Breadcrumb text */}
                    <div className="text-sm text-muted-foreground hidden sm:block">
                        <span>My Todos</span>
                        <span className="mx-2">&gt;</span>
                        <span className="text-foreground font-medium truncate max-w-xs inline-block align-bottom">
                            {todoItem.title}
                        </span>
                    </div>
                </div>

                {/* Main Card */}
                <Card
                    ref={cardRef}
                    className={`todo-card-gradient todo-fade-in-up ${
                        todoItem.completed ? 'todo-success-gradient' : ''
                    } ${borderColorClass} ${isUpdating || isDeleting ? 'opacity-60' : ''}`}
                >
                    <CardContent className="p-6 sm:p-8">
                        {/* Completion Checkbox + Title Section */}
                        <div className="mb-6">
                            <div className="flex items-start gap-4 mb-4">
                                {/* Large Custom Checkbox */}
                                <button
                                    className={`todo-checkbox ${todoItem.completed ? 'checked' : ''}`}
                                    aria-checked={todoItem.completed}
                                    role="checkbox"
                                    onClick={handleToggleComplete}
                                    disabled={isUpdating || isDeleting}
                                    aria-label={todoItem.completed ? 'Mark as incomplete' : 'Mark as complete'}
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        minWidth: '48px',
                                        minHeight: '48px'
                                    }}
                                >
                                    {todoItem.completed && <Check className="h-5 w-5" />}
                                </button>

                                {/* Title Display/Edit */}
                                <div className="flex-1 min-w-0">
                                    {isEditingTitle ? (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                handleSaveEdit();
                                            }}
                                            className="space-y-3"
                                        >
                                            <div className="relative pb-6">
                                                <Input
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Escape') {
                                                            handleCancelEdit();
                                                        }
                                                    }}
                                                    disabled={isUpdating}
                                                    autoFocus
                                                    maxLength={maxTitleLength}
                                                    className="text-xl sm:text-2xl font-semibold border-2 focus:border-primary"
                                                    aria-label="Todo title"
                                                />
                                                <span className="absolute bottom-1 right-0 text-xs text-muted-foreground">
                                                    {titleCharCount}/{maxTitleLength}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="submit"
                                                    variant="default"
                                                    size="sm"
                                                    disabled={isUpdating || !editTitle.trim()}
                                                >
                                                    <Save className="mr-2 h-4 w-4" />
                                                    Save
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleCancelEdit}
                                                    disabled={isUpdating}
                                                >
                                                    <X className="mr-2 h-4 w-4" />
                                                    Cancel
                                                </Button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div>
                                            <h1
                                                className={`text-xl sm:text-2xl font-semibold break-words cursor-pointer hover:text-primary/80 transition-colors ${
                                                    todoItem.completed ? 'todo-completed-text' : ''
                                                }`}
                                                onClick={handleStartEdit}
                                                title="Click to edit"
                                            >
                                                {todoItem.title}
                                            </h1>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Click title to edit
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Due Date Section */}
                        <div className="mb-6">
                            {todoItem.dueDate ? (
                                <Badge
                                    variant={isDueDateOverdue ? 'destructive' : isDueDateToday ? 'default' : 'secondary'}
                                    className="text-sm cursor-pointer hover:opacity-80 transition-opacity px-4 py-2"
                                    onClick={() => setDatePickerOpen(true)}
                                >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {isDueDateOverdue
                                        ? `OVERDUE - ${formatDueDate(todoItem.dueDate)}`
                                        : isDueDateToday
                                        ? 'DUE TODAY'
                                        : `Due ${formatDueDate(todoItem.dueDate)}`}
                                </Badge>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDatePickerOpen(true)}
                                    disabled={isUpdating || isDeleting}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Set due date
                                </Button>
                            )}
                        </div>

                        {/* Metadata Section */}
                        <div className="space-y-3 mb-6 text-sm text-muted-foreground">
                            {/* Created */}
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 flex-shrink-0" />
                                <span>
                                    Created {formatRelativeTime(todoItem.createdAt)}
                                </span>
                            </div>

                            {/* Updated */}
                            <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 flex-shrink-0" />
                                <span>
                                    Updated {formatRelativeTime(todoItem.updatedAt)}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-border">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteConfirmOpen(true)}
                                disabled={isUpdating || isDeleting}
                                className="flex-1 sm:flex-none hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Date Picker Dialog */}
            <DatePickerDialog
                open={datePickerOpen}
                onOpenChange={setDatePickerOpen}
                selectedDate={todoItem.dueDate ? new Date(todoItem.dueDate) : undefined}
                onDateSelect={handleDateSelect}
            />

            {/* Delete Confirmation Dialog */}
            <DeleteTodoDialog
                open={deleteConfirmOpen}
                todo={todoItem}
                onConfirm={() => {
                    setDeleteConfirmOpen(false);
                    handleDelete();
                }}
                onCancel={() => setDeleteConfirmOpen(false)}
            />

            {/* Celebration Effect */}
            <CelebrationEffect
                active={celebrating}
                onComplete={() => setCelebrating(false)}
            />
        </div>
    );
};

export default SingleTodo;
