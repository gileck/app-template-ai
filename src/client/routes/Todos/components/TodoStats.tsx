/**
 * Todo Statistics Component
 *
 * Displays total, completed, and percentage stats with an animated progress bar.
 */

import { Card } from '@/client/components/ui/card';
import { Badge } from '@/client/components/ui/badge';
import type { TodoItemClient } from '@/server/database/collections/todos/types';
import { isToday, isOverdue } from '../utils/dateUtils';

interface TodoStatsProps {
    todos: TodoItemClient[];
}

export function TodoStats({ todos }: TodoStatsProps) {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const dueToday = todos.filter((t) => isToday(t.dueDate)).length;
    const overdue = todos.filter((t) => !t.completed && isOverdue(t.dueDate)).length;

    return (
        <Card className="mb-5 p-3 todo-stats-card">
            <div className="mb-2">
                <h2 className="text-sm font-medium text-muted-foreground">Your Progress</h2>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
                {/* Completed/Total */}
                <div className="text-center">
                    <div className="text-xl font-bold">{completed}/{total}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                </div>

                {/* Percentage */}
                <div className="text-center">
                    <div className="text-xl font-bold text-primary">{percentage}%</div>
                    <div className="text-xs text-muted-foreground">Progress</div>
                </div>

                {/* Total */}
                <div className="text-center">
                    <div className="text-xl font-bold text-muted-foreground">{total}</div>
                    <div className="text-xs text-muted-foreground">Total Tasks</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="todo-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} aria-live="polite">
                <div className="todo-progress-fill" style={{ width: `${percentage}%` }} />
            </div>

            {/* Due Date Stats */}
            {(dueToday > 0 || overdue > 0) && (
                <div className="mt-3 flex gap-2 flex-wrap">
                    {dueToday > 0 && (
                        <Badge variant="default" className="text-xs">
                            Due Today: {dueToday}
                        </Badge>
                    )}
                    {overdue > 0 && (
                        <Badge variant="destructive" className="text-xs">
                            Overdue: {overdue}
                        </Badge>
                    )}
                </div>
            )}
        </Card>
    );
}
