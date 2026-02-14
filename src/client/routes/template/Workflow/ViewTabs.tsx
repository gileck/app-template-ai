/**
 * ViewTabs
 *
 * Tab bar for filtering workflow items by view (All/Pending/Active/Done/Activity).
 */

import type { ViewFilter } from './store';

const VIEW_OPTIONS: { value: ViewFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'done', label: 'Done' },
    { value: 'activity', label: 'Activity' },
];

export function ViewTabs({ active, onChange }: { active: ViewFilter; onChange: (v: ViewFilter) => void }) {
    return (
        <div className="flex rounded-lg bg-muted p-0.5">
            {VIEW_OPTIONS.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        active === opt.value
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
