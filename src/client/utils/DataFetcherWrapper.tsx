import React, { useState, useEffect, ComponentType } from 'react';
import { Box, CircularProgress, Alert, Button } from '@mui/material';
import { CacheResult } from '@/common/cache/types';
import { useRouter } from '../router';

// Generic type for data fetching functions
type DataFetcher<T = unknown> = () => Promise<CacheResult<T>>;

// Type for data fetching function that accepts query params
type DataFetcherWithParams<T = unknown> = (queryParams: Record<string, string>) => Promise<CacheResult<T>>;

// Union type for fetchers
type DataFetcherOrWithParams<T = unknown> = DataFetcher<T> | DataFetcherWithParams<T>;

// Type for the fetchers object
type DataFetchers = Record<string, DataFetcherOrWithParams>;

// Extract the resolved data types from fetchers
type ExtractDataTypes<T extends DataFetchers> = {
    [K in keyof T]: T[K] extends DataFetcherOrWithParams<infer U> ? U : never;
};

// Props that include the fetched data, loading state, error, and refresh function
type WithDataFetcherProps<T extends DataFetchers> = ExtractDataTypes<T> & {
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
};

// Type for the wrapped component props
type WrappedComponentProps<T extends DataFetchers, P = Record<string, never>> = P & WithDataFetcherProps<T>;

interface DataFetcherWrapperOptions<T extends DataFetchers = DataFetchers> {
    showGlobalLoading?: boolean;
    showGlobalError?: boolean;
    enableRefresh?: boolean;
    loader?: ComponentType | null;
    customRefreshFetchers?: T; // Custom fetchers to use for refresh (e.g., with bypassCache)
}

/**
 * Higher-Order Component that wraps a component with data fetching capabilities
 * @param fetchers - Object containing data fetching functions keyed by prop name
 * @param Component - The component to wrap
 * @param options - Configuration options
 * @returns A new component that handles data fetching and passes data as props
 */
export function DataFetcherWrapper<
    T extends DataFetchers,
    P extends Record<string, never> = Record<string, never>
>(
    fetchers: T,
    Component: ComponentType<WrappedComponentProps<T, P>>,
    options: DataFetcherWrapperOptions<T> = {}
): ComponentType<P> {
    const {
        showGlobalLoading = false,
        showGlobalError = true,
        enableRefresh = true,
        loader = null,
        customRefreshFetchers
    } = options;

    return function WrappedComponent(props: P) {
        const [data, setData] = useState<Partial<ExtractDataTypes<T>>>({});
        const [isLoading, setIsLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);
        const [fetchedKeys, setFetchedKeys] = useState<Set<string>>(new Set());
        const { queryParams } = useRouter();

        const fetchData = async (refresh = false) => {
            const totalFetchers = Object.keys(fetchers).length;

            if (!refresh && fetchedKeys.size === totalFetchers) {
                return; // All data already fetched
            }

            setIsLoading(true);
            setError(null);

            try {
                // Use custom refresh fetchers if provided and this is a refresh
                const fetchersToUse = refresh && customRefreshFetchers ? customRefreshFetchers : fetchers;
                const fetcherEntries = Object.entries(fetchersToUse);

                const results = await Promise.allSettled(
                    fetcherEntries.map(([key, fetcher]) => {
                        // Check if the fetcher accepts parameters by examining its length
                        const fetcherResult = fetcher.length > 0
                            ? (fetcher as DataFetcherWithParams)(queryParams)
                            : (fetcher as DataFetcher)();

                        return fetcherResult.then(result => ({ key, result }));
                    })
                );

                const newData: Partial<ExtractDataTypes<T>> = {};
                const newFetchedKeys = new Set<string>();
                let hasError = false;
                let errorMessage = '';

                results.forEach((result, index) => {
                    const key = fetcherEntries[index][0];

                    if (result.status === 'fulfilled') {
                        const { result: cacheResult } = result.value;

                        if (cacheResult.data && typeof cacheResult.data === 'object' && 'error' in cacheResult.data && cacheResult.data.error) {
                            // API returned an error
                            hasError = true;
                            errorMessage = cacheResult.data.error as string;
                        } else {
                            // Success - extract the actual data
                            newData[key as keyof ExtractDataTypes<T>] = cacheResult.data as ExtractDataTypes<T>[keyof ExtractDataTypes<T>];
                            newFetchedKeys.add(key);
                        }
                    } else {
                        // Network or other error
                        hasError = true;
                        errorMessage = `Failed to fetch ${key}: ${result.reason?.message || 'Unknown error'}`;
                    }
                });

                // Only update state if ALL fetchers succeeded
                if (!hasError && newFetchedKeys.size === totalFetchers) {
                    setData(newData);
                    setFetchedKeys(newFetchedKeys);
                } else if (hasError) {
                    // Clear any partial data on error
                    setData({});
                    setFetchedKeys(new Set());
                    setError(errorMessage);
                }
            } catch (err) {
                // Clear any partial data on error
                setData({});
                setFetchedKeys(new Set());
                setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            } finally {
                setIsLoading(false);
            }
        };

        const refresh = () => {
            setFetchedKeys(new Set()); // Reset fetched keys to force refetch
            fetchData(true);
        };

        useEffect(() => {
            fetchData();
        }, [queryParams]); // Add queryParams as dependency

        const totalFetchers = Object.keys(fetchers).length;
        const allFetchersResolved = fetchedKeys.size === totalFetchers;

        // Show custom loader if provided, or global loading if enabled and still loading
        if ((isLoading || !allFetchersResolved)) {
            if (loader) {
                const LoaderComponent = loader;
                return <LoaderComponent />;
            } else if (showGlobalLoading) {
                return (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                );
            }
            // If no loader and showGlobalLoading is false, continue to render nothing
        }

        // Show global error state if enabled and there's an error
        if (showGlobalError && error) {
            return (
                <Box sx={{ p: 3 }}>
                    <Alert
                        severity="error"
                        action={
                            enableRefresh ? (
                                <Button color="inherit" size="small" onClick={refresh}>
                                    Retry
                                </Button>
                            ) : undefined
                        }
                    >
                        {error}
                    </Alert>
                </Box>
            );
        }

        // Only render the child component if ALL fetchers have resolved successfully
        if (!allFetchersResolved) {
            if (loader) {
                const LoaderComponent = loader;
                return <LoaderComponent />;
            } else if (showGlobalLoading) {
                return (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                );
            }
            // Return null if no loader is specified and global loading is disabled
            return null;
        }

        // Pass all data, loading state, error, and refresh function to the wrapped component
        const componentProps: WrappedComponentProps<T, P> = {
            ...props,
            ...(data as ExtractDataTypes<T>),
            isLoading,
            error,
            refresh,
        };

        return <Component {...componentProps} />;
    };
}

// Convenience function for simple single data fetcher
export function withDataFetcher<T, P extends Record<string, never> = Record<string, never>>(
    fetcher: DataFetcher<T>,
    Component: ComponentType<P & { data: T; isLoading: boolean; error: string | null; refresh: () => void }>,
    options?: DataFetcherWrapperOptions<{ data: DataFetcher<T> }>
): ComponentType<P> {
    return DataFetcherWrapper(
        { data: fetcher },
        Component as ComponentType<WrappedComponentProps<{ data: DataFetcher<T> }, P>>,
        options
    ) as ComponentType<P>;
} 