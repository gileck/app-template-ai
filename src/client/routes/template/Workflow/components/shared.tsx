/**
 * Shared Workflow Components
 *
 * Common components used across List, Kanban, and Timeline views:
 * - StatusBadge: Status/type/priority badges with consistent colors
 * - SelectCheckbox: Selection checkbox for bulk actions
 * - formatDate: Date formatting utility
 */

import { Check } from 'lucide-react';
import type { ViewFilter } from '../store';

// ── Date Formatting ──────────────────────────────────────────────────────────

export function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatRelativeTime(timestamp: string): string {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Badge Semantic Variants ──────────────────────────────────────────────────
// Maps badge keys to semantic color variants using theme tokens

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';

export const BADGE_VARIANTS: Record<string, BadgeVariant> = {
    // Type
    feature: 'info',
    bug: 'destructive',
    task: 'muted',
    // Pipeline status (matches STATUSES from server/project-management/config.ts)
    'Pending Approval': 'warning',
    'Backlog': 'muted',
    'Product Development': 'secondary',
    'Product Design': 'secondary',
    'Bug Investigation': 'destructive',
    'Technical Design': 'primary',
    'Ready for development': 'warning',
    'PR Review': 'info',
    'Final Review': 'info',
    'Done': 'success',
    // Review status
    'Waiting for Review': 'warning',
    'Approved': 'success',
    'Request Changes': 'warning',
    'Rejected': 'destructive',
    // Priority
    'critical': 'destructive',
    'high': 'warning',
    'medium': 'primary',
    'low': 'muted',
    // Source
    'source': 'muted',
};

export const DEFAULT_BADGE_VARIANT: BadgeVariant = 'muted';

// Tailwind class mappings for each variant (using semantic tokens)
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
    primary: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    success: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    info: 'bg-info text-info-foreground',
    muted: 'bg-muted text-muted-foreground',
};

// ── StatusBadge ──────────────────────────────────────────────────────────────

interface StatusBadgeProps {
    label: string;
    colorKey?: string;
}

export function StatusBadge({ label, colorKey }: StatusBadgeProps) {
    const variant = BADGE_VARIANTS[colorKey || label] || DEFAULT_BADGE_VARIANT;
    const variantClasses = VARIANT_CLASSES[variant];
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClasses}`}
        >
            {label}
        </span>
    );
}

// ── SelectCheckbox ───────────────────────────────────────────────────────────

interface SelectCheckboxProps {
    selected: boolean;
}

export function SelectCheckbox({ selected }: SelectCheckboxProps) {
    return (
        <div className="flex items-center pt-0.5 shrink-0">
            <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                }`}
            >
                {selected && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
        </div>
    );
}

// ── StatsBar ─────────────────────────────────────────────────────────────────

interface StatsBarProps {
    pendingCount: number;
    statusCounts: { status: string; count: number }[];
    onClickStatus: (view: ViewFilter) => void;
}

export function StatsBar({ pendingCount, statusCounts, onClickStatus }: StatsBarProps) {
    const total = pendingCount + statusCounts.reduce((sum, s) => sum + s.count, 0);
    if (total === 0) return null;

    return (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
            {pendingCount > 0 && (
                <button
                    onClick={() => onClickStatus('pending')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors min-h-11"
                >
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    <span>Pending {pendingCount}</span>
                </button>
            )}
            {statusCounts.map(({ status, count }) => {
                const variant = BADGE_VARIANTS[status] || DEFAULT_BADGE_VARIANT;
                // Status dot uses the semantic color token
                const dotClass = variant === 'primary' ? 'bg-primary' :
                    variant === 'secondary' ? 'bg-secondary' :
                    variant === 'success' ? 'bg-success' :
                    variant === 'warning' ? 'bg-warning' :
                    variant === 'destructive' ? 'bg-destructive' :
                    variant === 'info' ? 'bg-info' : 'bg-muted-foreground';
                return (
                    <button
                        key={status}
                        onClick={() => onClickStatus(status === 'Done' ? 'done' : 'active')}
                        className="flex items-center gap-1 hover:text-foreground transition-colors min-h-11"
                    >
                        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                        <span>{status} {count}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ── ViewFilterTabs ───────────────────────────────────────────────────────────

const VIEW_OPTIONS: { value: ViewFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'done', label: 'Done' },
];

interface ViewFilterTabsProps {
    active: ViewFilter;
    onChange: (v: ViewFilter) => void;
}

export function ViewFilterTabs({ active, onChange }: ViewFilterTabsProps) {
    return (
        <div className="flex rounded-lg bg-muted p-0.5">
            {VIEW_OPTIONS.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`flex-1 px-3 py-1.5 min-h-[36px] rounded-md text-xs font-medium transition-colors ${
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

// ── Pipeline Statuses ────────────────────────────────────────────────────────

export const PIPELINE_STATUSES = [
    'Backlog',
    'Product Development',
    'Product Design',
    'Bug Investigation',
    'Technical Design',
    'Ready for development',
    'PR Review',
    'Final Review',
] as const;

export const ALL_STATUSES = [...PIPELINE_STATUSES, 'Done'] as const;

export const ALL_SECTION_KEYS = ['pending', ...PIPELINE_STATUSES, 'Done'] as const;
