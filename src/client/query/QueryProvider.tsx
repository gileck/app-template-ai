import React from 'react';
import { QueryClientProvider, useIsRestoring } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { getQueryClient } from './queryClient';
import { createIDBPersister } from './persister';

interface QueryProviderProps {
    children: React.ReactNode;
}

/**
 * Blocks rendering until React Query cache is restored from IndexedDB
 * Shows themed background during restoration to prevent white flash
 */
function WaitForCacheRestore({ children }: { children: React.ReactNode }) {
    const isRestoring = useIsRestoring();

    if (isRestoring) {
        // Show themed background instead of null to prevent white flash
        // This is especially important on iOS when coming back from airplane mode
        return <div className="min-h-screen bg-background" />;
    }

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
