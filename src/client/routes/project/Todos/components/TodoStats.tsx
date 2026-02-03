/**
 * Todo Statistics Component
 *
 * Displays total, completed, and percentage stats with an animated progress bar.
 * Mobile-first design with larger text and touch-friendly badges.
 */

import { Card } from '@/client/components/template/ui/card';
import { Badge } from '@/client/components/template/ui/badge';
import type { TodoItemClient } from '@/server/database/collections/todos/types';
import { isToday, isOverdue } from '../utils/dateUtils';

interface TodoStatsProps {
    todos: TodoItemClient[];
}

export function TodoStats({ todos }: TodoStatsProps) {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const dueToday = todos.filter((t) => !t.completed && isToday(t.dueDate)).length;
    const overdue = todos.filter((t) => !t.completed && isOverdue(t.dueDate)).length;

    return (
        <Card className="mb-4 todo-stats-card">
            {/* Mobile: 16px padding, Desktop: 16px padding */}
            <div className="p-4">
                {/* Stats Grid - 3 columns */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    {/* Completed count */}
                    <div className="text-center">
                        <div className="text-2xl sm:text-xl font-bold">{completed}</div>
                        <div className="text-sm sm:text-xs text-muted-foreground">Completed</div>
                    </div>

                    {/* Progress percentage */}
                    <div className="text-center">
                        <div className="text-2xl sm:text-xl font-bold text-primary">{percentage}%</div>
                        <div className="text-sm sm:text-xs text-muted-foreground">Progress</div>
                    </div>

                    {/* Total count */}
                    <div className="text-center">
                        <div className="text-2xl sm:text-xl font-bold text-muted-foreground">{total}</div>
                        <div className="text-sm sm:text-xs text-muted-foreground">Total</div>
                    </div>
                </div>

                {/* Progress Bar - 8px height for visibility on mobile */}
                <div 
                    className="h-2 rounded-full overflow-hidden bg-muted" 
                    role="progressbar" 
                    aria-valuemin={0} 
                    aria-valuemax={100} 
                    aria-valuenow={percentage} 
                    aria-live="polite"
                >
                    <div className="todo-progress-fill" style={{ width: `${percentage}%` }} />
                </div>

                {/* Due Date Badges - Below progress bar */}
                {(dueToday > 0 || overdue > 0) && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                        {dueToday > 0 && (
                            <Badge variant="default" className="text-sm px-3 py-1">
                                Due Today: {dueToday}
                            </Badge>
                        )}
                        {overdue > 0 && (
                            <Badge variant="destructive" className="text-sm px-3 py-1">
                                Overdue: {overdue}
                            </Badge>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
