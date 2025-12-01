import React from 'react';
import { QueryClientProvider, useIsRestoring } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { getQueryClient } from './queryClient';
import { createIDBPersister } from './persister';

interface QueryProviderProps {
    children: React.ReactNode;
}

// Debug logger
function debugLog(message: string) {
    if (typeof window === 'undefined') return;
    const logs = JSON.parse(localStorage.getItem('_debug_logs') || '[]');
    logs.push(`${new Date().toISOString()}: ${message}`);
    if (logs.length > 50) logs.shift();
    localStorage.setItem('_debug_logs', JSON.stringify(logs));
    console.log('[DEBUG]', message);
}

/**
 * Waits for React Query cache to be restored from IndexedDB
 * 
 * Note: We no longer block rendering during restore. The singleton persister
 * pattern prevents re-restore on re-render, so there's no white flash issue.
 * Components handle their own loading states via isLoading checks.
 */
function WaitForCacheRestore({ children }: { children: React.ReactNode }) {
    const isRestoring = useIsRestoring();
    
    // Log restore status changes for debugging iOS issue
    React.useEffect(() => {
        debugLog(`WaitForCacheRestore: isRestoring=${isRestoring}`);
    }, [isRestoring]);
    
    return <>{children}</>;
}

// Module-level singleton - created once when module loads
// This prevents re-restore on component re-render (e.g., on network state change)
const persister = typeof window !== 'undefined' ? createIDBPersister() : null;

// Dehydrate options - stable reference at module level
const dehydrateOptions = {
    shouldDehydrateQuery: (query: { state: { status: string; error: unknown } }) => {
        // Only persist successful queries
        if (query.state.status !== 'success') {
            return false;
        }
        // Don't persist queries with errors
        if (query.state.error) {
            return false;
        }
        // Don't persist mutations
        return true;
    },
};

/**
 * React Query provider with IndexedDB persistence
 * 
 * Blocks app rendering until cache is restored from IndexedDB.
 * This ensures all components can assume cached data is available
 * without needing to check isRestoring individually.
 * 
 * IMPORTANT: The persister is a module-level singleton to prevent re-restore
 * when the component re-renders (e.g., on network state change).
 */
export function QueryProvider({ children }: QueryProviderProps) {
    const queryClient = getQueryClient();

    // Only use persistence on client side
    if (!persister) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    }

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                dehydrateOptions,
            }}
        >
            <WaitForCacheRestore>
                {children}
            </WaitForCacheRestore>
        </PersistQueryClientProvider>
    );
}

export default QueryProvider;
