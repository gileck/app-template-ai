/**
 * Create Todo Form Component
 */

import { useState } from 'react';
import { Button } from '@/client/components/template/ui/button';
import { Input } from '@/client/components/template/ui/input';
import { Card } from '@/client/components/template/ui/card';
import { Badge } from '@/client/components/template/ui/badge';
import { Plus, Calendar, X } from 'lucide-react';
import { useCreateTodoWithId } from '../hooks';
import { logger } from '@/client/features';
import { DatePickerDialog } from './DatePickerDialog';
import { formatDueDate } from '../utils/dateUtils';

interface CreateTodoFormProps {
    onError: (message: string) => void;
}

export function CreateTodoForm({ onError }: CreateTodoFormProps) {
    // eslint-disable-next-line state-management/prefer-state-architecture -- form input before submission
    const [newTodoTitle, setNewTodoTitle] = useState('');
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral form state
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral dialog state
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const createTodoMutation = useCreateTodoWithId();

    const handleCreateTodo = async () => {
        if (!newTodoTitle.trim()) {
            logger.warn('todos', 'Create todo attempted with empty title');
            onError('Please enter a todo title');
            return;
        }

        const title = newTodoTitle.trim();
        const dueDate = selectedDate?.toISOString();
        logger.info('todos', 'Creating new todo', { meta: { title, dueDate } });

        // Clear input immediately (optimistic - UI updates instantly)
        setNewTodoTitle('');
        setSelectedDate(undefined);

        createTodoMutation.mutate(
            { title, dueDate },
            {
                onSuccess: () => {
                    logger.info('todos', 'Todo created successfully', { meta: { title } });
                },
                onError: (err) => {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to create todo';
                    logger.error('todos', 'Failed to create todo', { meta: { title, error: errorMessage } });
                    onError(errorMessage);
                    // Restore input on error so user can retry
                    setNewTodoTitle(title);
                },
            }
        );
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCreateTodo();
        }
    };

    const handleDateSelect = (date: Date | undefined) => {
        setSelectedDate(date);
    };

    const handleClearDate = () => {
        setSelectedDate(undefined);
    };

    return (
        <>
            <Card className="mb-5 p-4 todo-card-gradient">
                <div className="flex flex-col gap-3">
                    {/* Desktop layout: horizontal row */}
                    <div className="hidden sm:flex items-center gap-3">
                        <Input
                            value={newTodoTitle}
                            onChange={(e) => setNewTodoTitle(e.target.value)}
                            placeholder="What awesome thing will you do today? ✨"
                            onKeyPress={handleKeyPress}
                            className="h-12 text-base todo-input-focus"
                        />
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setDatePickerOpen(true)}
                            className="h-12"
                            title="Set due date"
                        >
                            <Calendar className="h-5 w-5" />
                        </Button>
                        <Button
                            onClick={handleCreateTodo}
                            disabled={!newTodoTitle.trim()}
                            size="lg"
                            className="todo-button-gradient h-12 px-6"
                        >
                            <Plus className="mr-2 h-5 w-5" /> Add
                        </Button>
                    </div>

                    {/* Mobile layout: Input + button row (calendar 48px + Add button flex) */}
                    <div className="flex flex-col gap-3 sm:hidden todo-create-form-mobile">
                        <Input
                            value={newTodoTitle}
                            onChange={(e) => setNewTodoTitle(e.target.value)}
                            placeholder="What will you do today? ✨"
                            onKeyPress={handleKeyPress}
                            className="h-12 text-base w-full todo-input-focus"
                        />
                        <div className="todo-create-buttons flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setDatePickerOpen(true)}
                                className="h-12 w-12 flex-shrink-0 px-0"
                                title="Set due date"
                                aria-label="Set due date"
                            >
                                <Calendar className="h-5 w-5" />
                            </Button>
                            <Button
                                onClick={handleCreateTodo}
                                disabled={!newTodoTitle.trim()}
                                className="todo-button-gradient h-12 flex-1 text-base"
                            >
                                <Plus className="mr-2 h-5 w-5" /> Add Todo
                            </Button>
                        </div>
                    </div>

                    {/* Show selected date badge */}
                    {selectedDate && (
                        <div className="flex items-center gap-2 todo-create-due-badge">
                            <Badge variant="secondary" className="text-sm">
                                <Calendar className="mr-1 h-3 w-3" />
                                Due: {formatDueDate(selectedDate.toISOString())}
                                <button
                                    onClick={handleClearDate}
                                    className="ml-2 hover:text-destructive"
                                    aria-label="Clear due date"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        </div>
                    )}
                </div>
            </Card>

            <DatePickerDialog
                open={datePickerOpen}
                onOpenChange={setDatePickerOpen}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
            />
        </>
    );
}
