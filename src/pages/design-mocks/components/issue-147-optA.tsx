/**
 * Issue #147 - Design Option A: Card Grid Layout
 *
 * A cleaner, more spacious card-based design with prominent action areas
 * and visual priority indicators. Focus on clarity and ease of use.
 */

import React, { useState } from 'react';
import { Card } from '@/client/components/template/ui/card';
import { Button } from '@/client/components/template/ui/button';
import { Input } from '@/client/components/template/ui/input';
import { Badge } from '@/client/components/template/ui/badge';
import { Separator } from '@/client/components/template/ui/separator';
import { Skeleton } from '@/client/components/template/ui/skeleton';

// Icons represented as emoji for mock purposes
const CheckIcon = () => <span className="text-sm">✓</span>;
const PlusIcon = () => <span className="text-lg">+</span>;
const CalendarIcon = () => <span className="text-sm">📅</span>;
const TrashIcon = () => <span className="text-sm">🗑️</span>;

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
}

// Sample data
const sampleTodos: Todo[] = [
  { id: '1', title: 'Review quarterly reports', completed: false, dueDate: 'Today', priority: 'high' },
  { id: '2', title: 'Call the dentist to schedule appointment', completed: false, dueDate: 'Tomorrow', priority: 'medium' },
  { id: '3', title: 'Buy groceries for the week', completed: false, priority: 'low' },
  { id: '4', title: 'Send birthday card to mom', completed: true, dueDate: 'Yesterday' },
  { id: '5', title: 'Update LinkedIn profile', completed: true },
];

export default function OptionA() {
  const [todos, setTodos] = useState<Todo[]>(sampleTodos);
  const [newTodo, setNewTodo] = useState('');
  const [view, setView] = useState<'populated' | 'empty' | 'loading'>('populated');

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  // Loading state
  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-background p-4">
        {/* Header skeleton */}
        <div className="mb-6">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>

        {/* Input skeleton */}
        <Skeleton className="h-14 rounded-xl mb-6" />

        {/* Todo items skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  // Empty state
  if (view === 'empty') {
    return (
      <div className="min-h-screen bg-background p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">My Todos</h1>
          <p className="text-sm text-muted-foreground">Organize your day</p>
        </div>

        {/* Add todo input */}
        <Card className="p-3 mb-6 border-dashed border-2 border-muted">
          <div className="flex gap-2">
            <Input
              placeholder="What needs to be done?"
              className="h-12 text-base border-0 bg-transparent focus-visible:ring-0"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
            />
            <Button size="icon" className="h-12 w-12 rounded-xl bg-primary">
              <PlusIcon />
            </Button>
          </div>
        </Card>

        {/* Empty state illustration */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No todos yet
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Add your first todo above to start organizing your tasks
          </p>
        </div>

        {/* View toggle */}
        <div className="fixed bottom-4 left-4 right-4 flex gap-2 max-w-md mx-auto">
          <Button variant="outline" size="sm" onClick={() => setView('populated')}>
            Show Populated
          </Button>
          <Button variant="outline" size="sm" onClick={() => setView('loading')}>
            Show Loading
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Todos</h1>
        <p className="text-sm text-muted-foreground">
          {activeTodos.length} remaining · {completedTodos.length} completed
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-3 text-center bg-primary/5 border-primary/20">
          <div className="text-2xl font-bold text-primary">{activeTodos.length}</div>
          <div className="text-xs text-muted-foreground">Active</div>
        </Card>
        <Card className="p-3 text-center bg-muted/50">
          <div className="text-2xl font-bold text-foreground">{todos.filter(t => t.dueDate === 'Today').length}</div>
          <div className="text-xs text-muted-foreground">Due Today</div>
        </Card>
        <Card className="p-3 text-center bg-muted/50">
          <div className="text-2xl font-bold text-muted-foreground">{completedTodos.length}</div>
          <div className="text-xs text-muted-foreground">Done</div>
        </Card>
      </div>

      {/* Add Todo */}
      <Card className="p-3 mb-6 shadow-sm">
        <div className="flex gap-2">
          <Input
            placeholder="Add a new todo..."
            className="h-12 text-base"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
          />
          <Button size="icon" className="h-12 w-12 rounded-xl bg-primary shrink-0">
            <PlusIcon />
          </Button>
        </div>
      </Card>

      {/* Active Todos */}
      <div className="space-y-3 mb-6">
        {activeTodos.map((todo) => (
          <Card
            key={todo.id}
            className={`p-4 transition-all ${
              todo.priority === 'high' ? 'border-l-4 border-l-destructive' :
              todo.priority === 'medium' ? 'border-l-4 border-l-primary' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <button
                onClick={() => toggleTodo(todo.id)}
                className="mt-0.5 w-6 h-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center shrink-0 hover:border-primary transition-colors"
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-base text-foreground font-medium leading-snug">
                  {todo.title}
                </p>
                {todo.dueDate && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Badge
                      variant={todo.dueDate === 'Today' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      <span className="mr-1"><CalendarIcon /></span>
                      {todo.dueDate}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Delete button */}
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive">
                <TrashIcon />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Completed Section */}
      {completedTodos.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground font-medium">
              Completed ({completedTodos.length})
            </span>
            <Separator className="flex-1" />
          </div>

          <div className="space-y-2">
            {completedTodos.map((todo) => (
              <Card key={todo.id} className="p-3 bg-muted/30 border-muted">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary"
                  >
                    <CheckIcon />
                  </button>
                  <p className="text-sm text-muted-foreground line-through flex-1">
                    {todo.title}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* View toggle for demo */}
      <div className="fixed bottom-4 left-4 right-4 flex gap-2 max-w-md mx-auto">
        <Button variant="outline" size="sm" onClick={() => setView('empty')}>
          Show Empty
        </Button>
        <Button variant="outline" size="sm" onClick={() => setView('loading')}>
          Show Loading
        </Button>
      </div>
    </div>
  );
}
