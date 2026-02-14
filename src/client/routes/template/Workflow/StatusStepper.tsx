/**
 * StatusStepper
 *
 * Mini pipeline progress indicator showing where an item is in the workflow.
 * Renders a row of small dots, highlighting completed/current steps.
 */

import { PIPELINE_STATUSES } from './constants';

const STEPS = [...PIPELINE_STATUSES, 'Done'] as const;

export function StatusStepper({ currentStatus }: { currentStatus: string | null }) {
    if (!currentStatus) return null;

    const currentIndex = STEPS.indexOf(currentStatus as typeof STEPS[number]);
    if (currentIndex === -1) return null;

    return (
        <div className="flex items-center gap-1" title={currentStatus}>
            {STEPS.map((step, i) => (
                <div
                    key={step}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i <= currentIndex ? 'bg-primary' : 'bg-muted-foreground/25'
                    }`}
                    title={step}
                />
            ))}
        </div>
    );
}
