/**
 * Todo Animation Helpers
 *
 * Constants and helper functions for celebration animations.
 */

export const CELEBRATION_DURATION = 1500; // ms
export const CLEANUP_DELAY = CELEBRATION_DURATION + 300; // 1800ms

/**
 * Checks if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Debounce function to prevent rapid celebration triggers
 */
export function debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            func(...args);
        }, wait);
    };
}
