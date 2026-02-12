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

// ── Badge Colors ─────────────────────────────────────────────────────────────
// Note: These are theme-independent for consistent status visibility across themes

export const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
    // Type
    feature: { bg: '#3b82f6', text: '#fff' },
    bug: { bg: '#ef4444', text: '#fff' },
    task: { bg: '#6b7280', text: '#fff' },
    // Pipeline status (matches STATUSES from server/project-management/config.ts)
    'Pending Approval': { bg: '#f59e0b', text: '#fff' },
    'Backlog': { bg: '#6b7280', text: '#fff' },
    'Product Development': { bg: '#a855f7', text: '#fff' },
    'Product Design': { bg: '#8b5cf6', text: '#fff' },
    'Bug Investigation': { bg: '#ec4899', text: '#fff' },
    'Technical Design': { bg: '#3b82f6', text: '#fff' },
    'Ready for development': { bg: '#f59e0b', text: '#fff' },
    'PR Review': { bg: '#06b6d4', text: '#fff' },
    'Final Review': { bg: '#0d9488', text: '#fff' },
    'Done': { bg: '#22c55e', text: '#fff' },
    // Review status
    'Waiting for Review': { bg: '#eab308', text: '#fff' },
    'Approved': { bg: '#22c55e', text: '#fff' },
    'Request Changes': { bg: '#f97316', text: '#fff' },
    'Rejected': { bg: '#ef4444', text: '#fff' },
    // Priority
    'critical': { bg: '#dc2626', text: '#fff' },
    'high': { bg: '#f97316', text: '#fff' },
    'medium': { bg: '#3b82f6', text: '#fff' },
    'low': { bg: '#9ca3af', text: '#fff' },
    // Source
    'source': { bg: '#6b7280', text: '#fff' },
};

export const DEFAULT_BADGE_COLOR = { bg: '#9ca3af', text: '#fff' };

// ── StatusBadge ──────────────────────────────────────────────────────────────

interface StatusBadgeProps {
    label: string;
    colorKey?: string;
}

export function StatusBadge({ label, colorKey }: StatusBadgeProps) {
    const colors = BADGE_COLORS[colorKey || label] || DEFAULT_BADGE_COLOR;
    return (
        <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: colors.bg, color: colors.text }}
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
                    className="flex items-center gap-1 hover:text-foreground transition-colors min-h-[28px]"
                >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BADGE_COLORS['Pending Approval'].bg }} />
                    <span>Pending {pendingCount}</span>
                </button>
            )}
            {statusCounts.map(({ status, count }) => (
                <button
                    key={status}
                    onClick={() => onClickStatus(status === 'Done' ? 'done' : 'active')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors min-h-[28px]"
                >
                    <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: (BADGE_COLORS[status] || DEFAULT_BADGE_COLOR).bg }}
                    />
                    <span>{status} {count}</span>
                </button>
            ))}
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
