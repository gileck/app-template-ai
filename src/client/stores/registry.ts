/**
 * Zustand Store Registry
 * 
 * Central registry for all Zustand stores with cache management utilities.
 */

import type { StoreInfo, CacheSize, CacheSizeInfo } from './types';
import { formatBytes } from '@/client/lib/utils';

// ============================================================================
// Registry Storage
// ============================================================================

/**
 * Internal registry of all stores
 */
const storeRegistry = new Map<string, StoreInfo>();

// ============================================================================
// Registration (internal use by createStore)
// ============================================================================

/**
 * Register a store in the registry (called by createStore)
 * @internal
 */
export function registerStore(info: StoreInfo): void {
    if (storeRegistry.has(info.key)) {
        console.warn(`[Store Registry] Store "${info.key}" is already registered. Overwriting.`);
    }
    storeRegistry.set(info.key, info);
}

// ============================================================================
// Query Utilities
// ============================================================================

/**
 * Get all registered stores
 */
export function getAllStores(): StoreInfo[] {
    return Array.from(storeRegistry.values());
}

/**
 * Get only persisted stores (those using localStorage)
 */
export function getPersistedStores(): StoreInfo[] {
    return getAllStores().filter((store) => store.isPersisted);
}

/**
 * Get only in-memory stores
 */
export function getInMemoryStores(): StoreInfo[] {
    return getAllStores().filter((store) => !store.isPersisted);
}

// ============================================================================
// Cache Size Utilities
// ============================================================================

/**
 * Get the size of a single localStorage item
 */
function getItemSize(key: string): number {
    if (typeof localStorage === 'undefined') return 0;
    try {
        const data = localStorage.getItem(key);
        return data ? new Blob([data]).size : 0;
    } catch {
        return 0;
    }
}

/**
 * Get total cache size of all persisted stores
 */
export function getTotalCacheSize(): CacheSize {
    const stores = getPersistedStores();
    const bytes = stores.reduce((total, store) => total + getItemSize(store.key), 0);
    return { bytes, formatted: formatBytes(bytes) };
}

/**
 * Get cache size breakdown per store
 */
export function getCacheSizeBreakdown(): CacheSizeInfo[] {
    const stores = getPersistedStores();
    return stores
        .map((store) => {
            const bytes = getItemSize(store.key);
            return {
                key: store.key,
                label: store.label,
                bytes,
                formatted: formatBytes(bytes),
            };
        })
        .sort((a, b) => b.bytes - a.bytes); // Sort by size descending
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear all persisted store data from localStorage
 */
export function clearAllPersistedStores(): void {
    if (typeof localStorage === 'undefined') return;
    
    const stores = getPersistedStores();
    stores.forEach((store) => {
        try {
            localStorage.removeItem(store.key);
        } catch (error) {
            console.error(`[Store Registry] Failed to clear store "${store.key}":`, error);
        }
    });
}

/**
 * Clear a specific store's persisted data
 */
export function clearPersistedStore(key: string): boolean {
    if (typeof localStorage === 'undefined') return false;
    
    const store = storeRegistry.get(key);
    if (!store) {
        console.warn(`[Store Registry] Store "${key}" not found in registry`);
        return false;
    }
    if (!store.isPersisted) {
        console.warn(`[Store Registry] Store "${key}" is not persisted`);
        return false;
    }
    
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`[Store Registry] Failed to clear store "${key}":`, error);
        return false;
    }
}

// ============================================================================
// Debug Utilities
// ============================================================================

/**
 * Print all stores to console for debugging
 */
export function printAllStores(): void {
    console.group('[Store Registry] All Registered Stores');
    
    const stores = getAllStores();
    console.log(`Total stores: ${stores.length}`);
    console.log(`Persisted: ${getPersistedStores().length}`);
    console.log(`In-memory: ${getInMemoryStores().length}`);
    console.log('---');
    
    // Print persisted stores with their data
    const persistedStores = getPersistedStores();
    if (persistedStores.length > 0) {
        console.group('📦 Persisted Stores');
        persistedStores.forEach((store) => {
            try {
                const data = localStorage.getItem(store.key);
                if (data) {
                    const parsed = JSON.parse(data);
                    const size = formatBytes(new Blob([data]).size);
                    console.group(`${store.label} (${store.key})`);
                    console.log('Size:', size);
                    console.log('Data:', parsed);
                    console.groupEnd();
                } else {
                    console.log(`${store.label} (${store.key}): (empty)`);
                }
            } catch (error) {
                console.error(`${store.label} (${store.key}): Failed to parse`, error);
            }
        });
        console.groupEnd();
    }
    
    // Print in-memory stores
    const inMemoryStores = getInMemoryStores();
    if (inMemoryStores.length > 0) {
        console.group('💭 In-Memory Stores');
        inMemoryStores.forEach((store) => {
            console.log(`${store.label} (${store.key})`);
        });
        console.groupEnd();
    }
    
    // Print total size
    const totalSize = getTotalCacheSize();
    console.log('---');
    console.log(`Total persisted size: ${totalSize.formatted}`);
    
    console.groupEnd();
}

