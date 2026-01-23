/**
 * Todo Statistics Component
 *
 * Displays total, completed, and percentage stats with an animated progress bar.
 */

import { Card } from '@/client/components/ui/card';
import type { TodoItemClient } from '@/server/database/collections/todos/types';

interface TodoStatsProps {
    todos: TodoItemClient[];
}

export function TodoStats({ todos }: TodoStatsProps) {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <Card className="mb-4 p-4 todo-stats-card">
            <div className="mb-3">
                <h2 className="text-lg font-semibold todo-gradient-text">Your Progress</h2>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                {/* Total */}
                <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                </div>

                {/* Completed */}
                <div className="text-center">
                    <div className="text-2xl font-bold text-success">{completed}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                </div>

                {/* Percentage */}
                <div className="text-center">
                    <div className="text-2xl font-bold text-secondary">{percentage}%</div>
                    <div className="text-xs text-muted-foreground">Progress</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="todo-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} aria-live="polite">
                <div className="todo-progress-fill" style={{ width: `${percentage}%` }} />
            </div>
        </Card>
    );
}
