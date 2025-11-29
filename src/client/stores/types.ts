/**
 * Shared types for Zustand stores
 */

/**
 * Public user info stored as a hint for instant boot
 * This is persisted to localStorage and used before auth validation completes
 */
export interface UserPublicHint {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

/**
 * Settings shape (matches existing Settings type)
 */
export interface Settings {
    aiModel: string;
    theme: 'light' | 'dark';
    offlineMode: boolean;
    staleWhileRevalidate: boolean;
}

/**
 * UI filters that can be persisted
 */
export interface UIFilters {
    [key: string]: unknown;
}

/**
 * Timestamp wrapper for TTL validation
 */
export interface PersistedWithTimestamp<T> {
    data: T;
    timestamp: number;
}

/**
 * Default TTL values (in milliseconds)
 * Used by stores for expiring cached data
 */
export const TTL = {
    /** Auth hint expires after 7 days */
    AUTH_HINT: 7 * 24 * 60 * 60 * 1000,
    /** UI state expires after 30 days */
    UI_STATE: 30 * 24 * 60 * 60 * 1000,
} as const;

