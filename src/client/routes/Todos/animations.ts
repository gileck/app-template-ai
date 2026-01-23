/**
 * Todo Animation Helpers
 *
 * Constants and helper functions for celebration animations.
 */

export const CELEBRATION_DURATION = 1500; // ms

/**
 * Triggers a celebration effect with confetti and bounce animation
 */
export function triggerCelebration(element: HTMLElement | null) {
    if (!element) return;

    // Add bounce animation class
    element.classList.add('todo-celebration-bounce');

    // Remove class after animation completes
    setTimeout(() => {
        element.classList.remove('todo-celebration-bounce');
    }, 600);
}

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

    return function (this: unknown, ...args: Parameters<T>) {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, wait);
    };
}
