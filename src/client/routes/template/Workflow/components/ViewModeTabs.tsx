/**
 * ViewModeTabs
 *
 * Tab bar for switching between List, Kanban, and Timeline views.
 * Follows mobile-first design with touch-friendly 44px minimum targets.
 */

import { List, LayoutGrid, Activity } from 'lucide-react';
import type { WorkflowViewMode } from '../store';

const VIEW_MODE_OPTIONS: { value: WorkflowViewMode; label: string; icon: typeof List }[] = [
    { value: 'list', label: 'List', icon: List },
    { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
    { value: 'timeline', label: 'Timeline', icon: Activity },
];

interface ViewModeTabsProps {
    active: WorkflowViewMode;
    onChange: (mode: WorkflowViewMode) => void;
}

export function ViewModeTabs({ active, onChange }: ViewModeTabsProps) {
    return (
        <div className="flex rounded-lg bg-muted p-1 gap-1">
            {VIEW_MODE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = active === opt.value;
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 min-h-11 rounded-md text-xs font-medium transition-colors ${
                            isActive
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                        aria-pressed={isActive}
                    >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
