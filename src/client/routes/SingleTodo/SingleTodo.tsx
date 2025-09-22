import React from 'react';
import { Card, CardContent } from '@/client/components/ui/card';
import { Button } from '@/client/components/ui/button';
import { Badge } from '@/client/components/ui/badge';
import { ArrowLeft, Edit, Trash2, Check, X } from 'lucide-react';
import { useRouter } from '../../router';
import { DataFetcherWrapper } from '../../utils/DataFetcherWrapper';
import { getTodo } from '../../../apis/todos/client';
import { GetTodoResponse } from '../../../apis/todos/types';

interface SingleTodoBaseProps {
    todo: GetTodoResponse;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

const SingleTodoBase: React.FC<SingleTodoBaseProps> = ({ todo, error }) => {
    const { navigate } = useRouter();

    if (error) {
        return (
            <div className="p-3 text-destructive">
                {error}
                <div>
                    <Button onClick={() => navigate('/todos')} className="mt-2">Back to Todos</Button>
                </div>
            </div>
        );
    }

    if (!todo.todo) {
        return (
            <div className="p-3">
                <p>Todo not found</p>
                <Button onClick={() => navigate('/todos')} className="mt-2">Back to Todos</Button>
            </div>
        );
    }

    const todoItem = todo.todo;

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

const SingleTodo = DataFetcherWrapper(
    {
        todo: (queryParams: Record<string, string>) => getTodo({ todoId: queryParams.todoId })
    },
    SingleTodoBase
);

export default SingleTodo; 