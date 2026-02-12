/**
 * Issue #147 - Design Option C: Compact Timeline View
 *
 * A minimalist, timeline-based design that organizes todos by time
 * (overdue, today, upcoming). Focuses on temporal context and
 * quick scanning. Clean aesthetic with swipe-action hints.
 */

import React, { useState } from 'react';
import { Card } from '@/client/components/template/ui/card';
import { Button } from '@/client/components/template/ui/button';
import { Input } from '@/client/components/template/ui/input';
import { Badge } from '@/client/components/template/ui/badge';
import { Skeleton } from '@/client/components/template/ui/skeleton';
import { Separator } from '@/client/components/template/ui/separator';

// Icons
const CheckIcon = () => <span className="text-xs">✓</span>;
const PlusIcon = () => <span>+</span>;

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  timeGroup: 'overdue' | 'today' | 'tomorrow' | 'later' | 'no-date';
  time?: string;
}

const sampleTodos: Todo[] = [
  { id: '1', title: 'Submit expense report', completed: false, timeGroup: 'overdue', time: 'Yesterday' },
  { id: '2', title: 'Review quarterly reports', completed: false, timeGroup: 'today', time: '2:00 PM' },
  { id: '3', title: 'Team sync meeting', completed: false, timeGroup: 'today', time: '4:30 PM' },
  { id: '4', title: 'Call mom', completed: true, timeGroup: 'today', time: '10:00 AM' },
  { id: '5', title: 'Dentist appointment', completed: false, timeGroup: 'tomorrow', time: '9:00 AM' },
  { id: '6', title: 'Grocery shopping', completed: false, timeGroup: 'later', time: 'Saturday' },
  { id: '7', title: 'Read new book', completed: false, timeGroup: 'no-date' },
];

const timeGroupLabels = {
  'overdue': { label: 'Overdue', color: 'text-destructive', bgColor: 'bg-destructive/10' },
  'today': { label: 'Today', color: 'text-primary', bgColor: 'bg-primary/10' },
  'tomorrow': { label: 'Tomorrow', color: 'text-foreground', bgColor: 'bg-muted' },
  'later': { label: 'Upcoming', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  'no-date': { label: 'Someday', color: 'text-muted-foreground', bgColor: 'bg-muted/50' },
};

export default function OptionC() {
  const [todos, setTodos] = useState<Todo[]>(sampleTodos);
  const [newTodo, setNewTodo] = useState('');
  const [view, setView] = useState<'populated' | 'empty' | 'loading'>('populated');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedToday = todos.filter(t => t.completed && t.timeGroup === 'today');

  // Group todos by time
  const groupedTodos = {
    overdue: activeTodos.filter(t => t.timeGroup === 'overdue'),
    today: activeTodos.filter(t => t.timeGroup === 'today'),
    tomorrow: activeTodos.filter(t => t.timeGroup === 'tomorrow'),
    later: activeTodos.filter(t => t.timeGroup === 'later'),
    'no-date': activeTodos.filter(t => t.timeGroup === 'no-date'),
  };

  // Loading state
  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-12 rounded-xl mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-6 w-24 mt-4" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      </div>
    );
  }

  // Empty state
  if (view === 'empty') {
    return (
      <div className="min-h-screen bg-background p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <div className="text-2xl">📋</div>
        </div>

        {/* Quick add */}
        <div className="flex gap-2 mb-8">
          <Input
            placeholder="Add a task..."
            className="h-12 text-base rounded-xl"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
          />
          <Button size="icon" className="h-12 w-12 rounded-xl shrink-0">
            <PlusIcon />
          </Button>
        </div>

        {/* Empty illustration */}
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
            <span className="text-4xl">✨</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">All clear!</h3>
          <p className="text-muted-foreground text-sm">
            No tasks scheduled. Enjoy your free time!
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
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {activeTodos.length} pending
          </p>
        </div>
        {completedToday.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {completedToday.length} done today
          </Badge>
        )}
      </div>

      {/* Quick Add - Floating style */}
      <Card className="p-2 mb-6 shadow-sm">
        <div className="flex gap-2">
          <Input
            placeholder="Quick add task..."
            className="h-11 text-base border-0 focus-visible:ring-0 bg-transparent"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
          />
          <Button size="icon" className="h-11 w-11 rounded-lg shrink-0">
            <PlusIcon />
          </Button>
        </div>
      </Card>

      {/* Timeline View */}
      <div className="space-y-6">
        {/* Overdue Section */}
        {groupedTodos.overdue.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-destructive">Overdue</span>
              <Badge variant="destructive" className="text-xs px-2">
                {groupedTodos.overdue.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {groupedTodos.overdue.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className="w-6 h-6 rounded-full border-2 border-destructive/50 shrink-0 hover:bg-destructive/10"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-foreground truncate">{todo.title}</p>
                    <p className="text-xs text-destructive">{todo.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Today Section */}
        {groupedTodos.today.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-primary">Today</span>
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="space-y-1">
              {groupedTodos.today.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className="w-6 h-6 rounded-full border-2 border-primary/50 shrink-0 hover:bg-primary/10 hover:border-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-foreground">{todo.title}</p>
                  </div>
                  {todo.time && (
                    <span className="text-xs text-muted-foreground shrink-0">{todo.time}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tomorrow Section */}
        {groupedTodos.tomorrow.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-foreground">Tomorrow</span>
            </div>
            <div className="space-y-1">
              {groupedTodos.tomorrow.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0"
                  />
                  <p className="text-base text-foreground flex-1">{todo.title}</p>
                  {todo.time && (
                    <span className="text-xs text-muted-foreground">{todo.time}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Later & No Date - Collapsible */}
        {(groupedTodos.later.length > 0 || groupedTodos['no-date'].length > 0) && (
          <section>
            <Separator className="mb-4" />
            <button
              onClick={() => setExpandedGroup(expandedGroup === 'later' ? null : 'later')}
              className="flex items-center justify-between w-full text-left mb-3"
            >
              <span className="text-sm font-semibold text-muted-foreground">
                Later ({groupedTodos.later.length + groupedTodos['no-date'].length})
              </span>
              <span className="text-muted-foreground">
                {expandedGroup === 'later' ? '−' : '+'}
              </span>
            </button>

            {expandedGroup === 'later' && (
              <div className="space-y-1">
                {[...groupedTodos.later, ...groupedTodos['no-date']].map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className="w-5 h-5 rounded-full border-2 border-muted-foreground/20 shrink-0"
                    />
                    <p className="text-base text-muted-foreground flex-1">{todo.title}</p>
                    {todo.time && (
                      <span className="text-xs text-muted-foreground">{todo.time}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Completed Today */}
        {completedToday.length > 0 && (
          <section>
            <Separator className="mb-4" />
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-muted-foreground">Done today</span>
            </div>
            <div className="space-y-1">
              {completedToday.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-2 rounded-lg opacity-60"
                >
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary">
                    <CheckIcon />
                  </div>
                  <p className="text-sm text-muted-foreground line-through flex-1">
                    {todo.title}
                  </p>
                </div>
              ))}
            </div>
          </section>
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
