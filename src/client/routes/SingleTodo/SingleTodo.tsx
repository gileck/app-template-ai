import React from 'react';
import { Card, CardContent } from '@/client/components/ui/card';
import { Button } from '@/client/components/ui/button';
import { Badge } from '@/client/components/ui/badge';
import { LinearProgress } from '@/client/components/ui/linear-progress';
import { ArrowLeft, Edit, Trash2, Check, X } from 'lucide-react';
import { useRouter } from '../../router';
import { useTodo } from '../Todos/hooks';

/**
 * Single Todo page component using React Query
 * 
 * Benefits:
 * - Instant load from IndexedDB cache
 * - Background revalidation
 */
const SingleTodo = () => {
    const { routeParams, navigate } = useRouter();
    const todoId = routeParams.todoId;

    const {
        data,
        isLoading,
        error
    } = useTodo(todoId || '');

    // Loading state - only show on initial load
    if (isLoading && !data) {
        return (
            <div className="w-full py-4">
                <LinearProgress />
                <p className="mt-2 text-center text-sm text-muted-foreground">Loading todo...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-3 text-destructive">
                {error instanceof Error ? error.message : 'An error occurred'}
                <div>
                    <Button onClick={() => navigate('/todos')} className="mt-2">Back to Todos</Button>
                </div>
            </div>
        );
    }

    if (!data?.todo) {
        return (
            <div className="p-3">
                <p>Todo not found</p>
                <Button onClick={() => navigate('/todos')} className="mt-2">Back to Todos</Button>
            </div>
        );
    }

    const todoItem = data.todo;

    return (
        <div className="p-3">
            <div className="mb-3 flex items-center">
                <Button variant="ghost" size="sm" className="mr-2" onClick={() => navigate('/todos')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <h1 className="text-2xl font-semibold">Todo Details</h1>
            </div>

            <Card className="max-w-xl">
                <CardContent>
                    <div className="mb-2 flex items-start justify-between">
                        <h2 className="text-xl font-medium">{todoItem.title}</h2>
                        <Badge variant={todoItem.completed ? 'success' : 'warning'} className="inline-flex items-center">
                            {todoItem.completed ? <Check className="mr-1 h-4 w-4" /> : <X className="mr-1 h-4 w-4" />}
                            {todoItem.completed ? 'Completed' : 'Pending'}
                        </Badge>
                    </div>

                    <div className="mb-3 text-sm text-muted-foreground">
                        <p>Created: {new Date(todoItem.createdAt).toLocaleDateString()}</p>
                        <p>Updated: {new Date(todoItem.updatedAt).toLocaleDateString()}</p>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={() => navigate(`/todos?edit=${todoItem._id}`)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button variant="outline" onClick={() => console.log('Delete todo:', todoItem._id)}>
                            <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SingleTodo;
