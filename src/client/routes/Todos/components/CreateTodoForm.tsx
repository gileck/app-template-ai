/**
 * Create Todo Form Component
 */

import { useState } from 'react';
import { Button } from '@/client/components/ui/button';
import { Input } from '@/client/components/ui/input';
import { Card } from '@/client/components/ui/card';
import { Plus } from 'lucide-react';
import { useCreateTodoWithId } from '../hooks';
import { logger } from '@/client/features/session-logs';

interface CreateTodoFormProps {
    onError: (message: string) => void;
}

export function CreateTodoForm({ onError }: CreateTodoFormProps) {
    // eslint-disable-next-line state-management/prefer-state-architecture -- form input before submission
    const [newTodoTitle, setNewTodoTitle] = useState('');
    const createTodoMutation = useCreateTodoWithId();

    const handleCreateTodo = async () => {
        if (!newTodoTitle.trim()) {
            logger.warn('todos', 'Create todo attempted with empty title');
            onError('Please enter a todo title');
            return;
        }

        const title = newTodoTitle.trim();
        logger.info('todos', 'Creating new todo', { meta: { title } });

        // Clear input immediately (optimistic - UI updates instantly)
        setNewTodoTitle('');

        createTodoMutation.mutate(
            { title },
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

    return (
        <Card className="mb-3 p-2">
            <div className="flex items-center gap-2">
                <Input
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    placeholder="Enter a new todo..."
                    onKeyPress={handleKeyPress}
                />
                <Button onClick={handleCreateTodo} disabled={!newTodoTitle.trim()}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
            </div>
        </Card>
    );
}
