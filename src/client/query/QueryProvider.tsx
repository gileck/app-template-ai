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

/**
 * React Query provider with IndexedDB persistence
 * 
 * Blocks app rendering until cache is restored from IndexedDB.
 * This ensures all components can assume cached data is available
 * without needing to check isRestoring individually.
 */
export function QueryProvider({ children }: QueryProviderProps) {
    const queryClient = getQueryClient();

    // Only use persistence on client side
    if (typeof window === 'undefined') {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    }

    const persister = createIDBPersister();

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                // Maximum age for persisted cache (24 hours)
                maxAge: 24 * 60 * 60 * 1000,
                // Dehydrate options - what to persist
                dehydrateOptions: {
                    shouldDehydrateQuery: (query) => {
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
                },
            }}
        >
            <WaitForCacheRestore>
                {children}
            </WaitForCacheRestore>
        </PersistQueryClientProvider>
    );
}

export default QueryProvider;
