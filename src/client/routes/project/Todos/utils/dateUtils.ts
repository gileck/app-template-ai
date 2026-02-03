/**
 * Date Utilities for Todo Due Dates
 *
 * Helper functions for date comparisons and formatting.
 *
 * TIMEZONE HANDLING:
 * - Due dates are stored in the database as Date objects (UTC internally)
 * - Client sends/receives dates as ISO strings (e.g., "2026-01-25T00:00:00.000Z")
 * - All date comparisons (isToday, isOverdue, etc.) use the user's LOCAL timezone
 * - This means "today" is calculated based on the user's local date, not UTC
 *
 * IMPORTANT: Setting a due date to "today" will store it as start-of-day in UTC,
 * but comparisons use local timezone to determine if it's "today" for the user.
 * This ensures users near midnight don't experience unexpected behavior.
 */

/**
 * Check if a date is today
 * @param date - Date string (ISO format) or undefined
 * @returns true if date is today in local timezone
 */
export function isToday(date: string | undefined): boolean {
    if (!date) return false;

    const inputDate = new Date(date);
    const today = new Date();

    return (
        inputDate.getDate() === today.getDate() &&
        inputDate.getMonth() === today.getMonth() &&
        inputDate.getFullYear() === today.getFullYear()
    );
}

/**
 * Check if a date is within the next 7 days (inclusive)
 * @param date - Date string (ISO format) or undefined
 * @returns true if date is within next 7 days
 */
export function isDueThisWeek(date: string | undefined): boolean {
    if (!date) return false;

    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return inputDate >= today && inputDate < nextWeek;
}

/**
 * Check if a date is in the past (overdue)
 * @param date - Date string (ISO format) or undefined
 * @returns true if date is in the past
 */
export function isOverdue(date: string | undefined): boolean {
    if (!date) return false;

    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    inputDate.setHours(0, 0, 0, 0);

    return inputDate < today;
}

/**
 * Format a date for display
 * @param date - Date string (ISO format)
 * @returns Formatted date string (e.g., "Dec 25", "Jan 1")
 */
export function formatDueDate(date: string): string {
    const d = new Date(date);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${month} ${day}`;
}

/**
 * Get quick date shortcuts
 * @returns Object with quick date functions
 */
export function getQuickDates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return {
        today: today.toISOString(),
        tomorrow: tomorrow.toISOString(),
        nextWeek: nextWeek.toISOString(),
    };
}

/**
 * Format timestamp as relative time with absolute fallback
 * @param dateString - ISO date string to format
 * @returns Formatted relative time string (e.g., "2 hours ago", "Yesterday at 3:45 PM", "Jan 25 at 3:45 PM")
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    const formatAbsolute = (d: Date) => {
        const thisYear = now.getFullYear();
        const dateYear = d.getFullYear();
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        const day = d.getDate();
        const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        if (dateYear === thisYear) {
            return `${month} ${day} at ${time}`;
        }
        return `${month} ${day}, ${dateYear} at ${time}`;
    };

    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays === 1) {
        return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else {
        return formatAbsolute(date);
    }
}
