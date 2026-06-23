/**
 * Issue #147 - Design Option B: Progress-Focused Dashboard
 *
 * A dashboard-style layout with prominent progress visualization,
 * category grouping, and quick-add actions. Focus on motivation
 * and progress tracking.
 */

import React, { useState } from 'react';
import { Card } from '@/client/components/template/ui/card';
import { Button } from '@/client/components/template/ui/button';
import { Input } from '@/client/components/template/ui/input';
import { Badge } from '@/client/components/template/ui/badge';
import { Skeleton } from '@/client/components/template/ui/skeleton';

// Icons
const CheckIcon = () => <span className="text-sm">✓</span>;
const PlusIcon = () => <span className="text-lg">+</span>;

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  category?: 'work' | 'personal' | 'health';
}

const sampleTodos: Todo[] = [
  { id: '1', title: 'Review quarterly reports', completed: false, dueDate: 'Today', category: 'work' },
  { id: '2', title: 'Schedule dentist appointment', completed: false, dueDate: 'Tomorrow', category: 'health' },
  { id: '3', title: 'Buy groceries', completed: false, category: 'personal' },
  { id: '4', title: 'Team standup meeting', completed: true, category: 'work' },
  { id: '5', title: 'Morning jog', completed: true, category: 'health' },
  { id: '6', title: 'Reply to emails', completed: true, category: 'work' },
];

export default function OptionB() {
  const [todos, setTodos] = useState<Todo[]>(sampleTodos);
  const [newTodo, setNewTodo] = useState('');
  const [view, setView] = useState<'populated' | 'empty' | 'loading'>('populated');

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);
  const progress = todos.length > 0 ? Math.round((completedTodos.length / todos.length) * 100) : 0;

  const categoryColors = {
    work: 'bg-blue-500',
    personal: 'bg-purple-500',
    health: 'bg-green-500',
  };

  // Loading state
  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-background">
        {/* Progress header skeleton */}
        <div className="bg-primary/10 p-6 pb-10">
          <Skeleton className="h-6 w-24 mb-2" />
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-3 w-full rounded-full" />
        </div>

        {/* Content skeleton */}
        <div className="p-4 -mt-6">
          <Skeleton className="h-14 rounded-2xl mb-6" />
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (view === 'empty') {
    return (
      <div className="min-h-screen bg-background">
        {/* Progress header */}
        <div className="bg-primary/10 p-6 pb-10">
          <p className="text-sm text-muted-foreground mb-1">Today&apos;s Progress</p>
          <h1 className="text-2xl font-bold text-foreground mb-4">0% Complete</h1>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-0 bg-primary rounded-full transition-all duration-500" />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 -mt-6">
          {/* Quick add */}
          <Card className="p-2 mb-6 shadow-lg rounded-2xl">
            <div className="flex gap-2">
              <Input
                placeholder="What&apos;s on your mind?"
                className="h-12 text-base border-0 focus-visible:ring-0"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
              />
              <Button className="h-12 px-6 rounded-xl">
                <PlusIcon />
              </Button>
            </div>
          </Card>

          {/* Empty state */}
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-lg font-semibold mb-2">Ready to be productive?</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Add your first task and start crushing your goals
            </p>

            {/* Category quick-add buttons */}
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" className="rounded-full">
                <span className="mr-2">💼</span> Work task
              </Button>
              <Button variant="outline" size="sm" className="rounded-full">
                <span className="mr-2">🏠</span> Personal
              </Button>
              <Button variant="outline" size="sm" className="rounded-full">
                <span className="mr-2">💪</span> Health
              </Button>
            </div>
          </div>
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
    <div className="min-h-screen bg-background">
      {/* Progress Header */}
      <div className="bg-primary/10 p-6 pb-10">
        <p className="text-sm text-muted-foreground mb-1">Today&apos;s Progress</p>
        <div className="flex items-baseline gap-2 mb-4">
          <h1 className="text-3xl font-bold text-foreground">{progress}%</h1>
          <span className="text-sm text-muted-foreground">
            {completedTodos.length} of {todos.length} tasks
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Motivational message */}
        {progress >= 50 && (
          <p className="text-sm text-primary mt-3 font-medium">
            {progress >= 100 ? '🎉 All done! Amazing work!' : '💪 Great progress! Keep going!'}
          </p>
        )}
      </div>

      {/* Main Content */}
      <div className="p-4 -mt-6">
        {/* Quick Add Card */}
        <Card className="p-2 mb-6 shadow-lg rounded-2xl">
          <div className="flex gap-2">
            <Input
              placeholder="Add a new task..."
              className="h-12 text-base border-0 focus-visible:ring-0"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
            />
            <Button className="h-12 px-6 rounded-xl shrink-0">
              <PlusIcon />
            </Button>
          </div>
        </Card>

        {/* Category Filter Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Badge variant="default" className="px-4 py-2 rounded-full cursor-pointer whitespace-nowrap">
            All ({todos.length})
          </Badge>
          <Badge variant="secondary" className="px-4 py-2 rounded-full cursor-pointer whitespace-nowrap">
            💼 Work ({todos.filter(t => t.category === 'work').length})
          </Badge>
          <Badge variant="secondary" className="px-4 py-2 rounded-full cursor-pointer whitespace-nowrap">
            🏠 Personal ({todos.filter(t => t.category === 'personal').length})
          </Badge>
          <Badge variant="secondary" className="px-4 py-2 rounded-full cursor-pointer whitespace-nowrap">
            💪 Health ({todos.filter(t => t.category === 'health').length})
          </Badge>
        </div>

        {/* Active Tasks */}
        {activeTodos.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              To Do ({activeTodos.length})
            </h2>
            <div className="space-y-2">
              {activeTodos.map((todo) => (
                <Card key={todo.id} className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Category indicator */}
                    <div className={`w-1 h-10 rounded-full ${todo.category ? categoryColors[todo.category] : 'bg-muted'}`} />

                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className="w-7 h-7 rounded-lg border-2 border-muted-foreground/30 flex items-center justify-center shrink-0 hover:border-primary hover:bg-primary/5 transition-all"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-foreground">{todo.title}</p>
                      {todo.dueDate && (
                        <p className={`text-xs mt-1 ${todo.dueDate === 'Today' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                          📅 {todo.dueDate}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTodos.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Completed ({completedTodos.length})
            </h2>
            <div className="space-y-2">
              {completedTodos.map((todo) => (
                <Card key={todo.id} className="p-3 bg-muted/20 border-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-1 h-8 rounded-full opacity-30 ${todo.category ? categoryColors[todo.category] : 'bg-muted'}`} />

                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center shrink-0 text-primary"
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
          </div>
        )}
      </div>

      {/* View toggle */}
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
