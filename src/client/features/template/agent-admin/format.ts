/**
 * Shared formatters for the admin agent/AI observability pages.
 * Kept dependency-free and pure so they can be unit-tested in isolation.
 */

const tokenFormatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

/** USD with extra precision for sub-cent amounts so tiny costs aren't $0.00. */
export function formatUsd(amount: number): string {
    if (!Number.isFinite(amount)) return '$0.00';
    if (amount === 0) return '$0.00';
    if (Math.abs(amount) < 0.01) return `$${amount.toFixed(4)}`;
    return `$${amount.toFixed(2)}`;
}

/** Compact token count, e.g. 1.2K / 3.4M. */
export function formatTokens(n: number): string {
    if (!Number.isFinite(n)) return '0';
    return tokenFormatter.format(n);
}

export function formatNumber(n: number): string {
    if (!Number.isFinite(n)) return '0';
    return n.toLocaleString();
}

/** Ratio in [0,1] → percentage string. */
export function formatPercent(ratio: number): string {
    if (!Number.isFinite(ratio)) return '0%';
    return `${(ratio * 100).toFixed(1)}%`;
}

/** Milliseconds → human duration. `null` renders as an em-dash. */
export function formatDurationMs(ms: number | null): string {
    if (ms === null || !Number.isFinite(ms)) return '—';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60_000).toFixed(1)}m`;
}

export function formatDateTime(iso: string | undefined | null): string {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString();
}

/** Compact "time ago" relative to now. */
export function formatRelativeTime(iso: string | undefined | null): string {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const diffMs = Date.now() - date.getTime();
    const sec = Math.round(diffMs / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.round(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.round(hr / 24);
    return `${days}d ago`;
}
