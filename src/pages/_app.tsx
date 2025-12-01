import "@/client/styles/globals.css";
import type { AppProps } from "next/app";
import { AppThemeProvider } from "@/client/components/ThemeProvider";
import dynamic from 'next/dynamic';
import { routes } from '@/client/routes';
import { Layout } from '@/client/components/Layout';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryProvider } from '@/client/query';
import {
  AuthWrapper,
  useSettingsStore,
  initializeOfflineListeners,
  subscribeToEffectiveOfflineChanges
} from '@/client/features';
import { initializeApiClient } from '@/client/utils/apiClient';
import { flushOfflineQueue, shouldFlushNow, onOfflineQueueSync } from '@/client/utils/offlinePostQueue';
import { BatchSyncAlert, useBatchSyncAlertStore } from '@/client/components/BatchSyncAlert';

const RouterProvider = dynamic(() => import('@/client/router/index').then(module => module.RouterProvider), { ssr: false });

export default function App({ }: AppProps) {
  return (
    <QueryProvider>
      <AppInitializer />
      <AppThemeProvider>
        <AuthWrapper>
          <RouterProvider routes={routes}>
            {RouteComponent => <Layout><RouteComponent /></Layout>}
          </RouterProvider>
        </AuthWrapper>
        <BatchSyncAlert />
      </AppThemeProvider>
    </QueryProvider>
  );
}

/**
 * App initialization component
 * Handles:
 * - Offline listener initialization
 * - API client initialization with settings
 * - Offline queue flushing on reconnect
 * - Cache invalidation after offline sync
 */
function AppInitializer() {
  const settings = useSettingsStore((state) => state.settings);
  const queryClient = useQueryClient();

  // Initialize offline listeners on mount
  useEffect(() => {
    const cleanup = initializeOfflineListeners();
    return cleanup;
  }, []);

  // Initialize API client with settings getter
  useEffect(() => {
    initializeApiClient(() => useSettingsStore.getState().settings);
  }, []);

  // Get the batch sync alert store
  const showBatchSyncFailures = useBatchSyncAlertStore((state) => state.showFailures);

  // Register callback to invalidate caches when offline items sync and show errors
  useEffect(() => {
    const unsubscribe = onOfflineQueueSync(({ syncedItems, failedItems }) => {
      // Extract unique entity types from synced items and invalidate their queries
      const entityTypes = new Set<string>();
      for (const item of syncedItems) {
        // Extract entity from API name (e.g., "todos/update" -> "todos")
        const entity = item.name.split('/')[0];
        if (entity) entityTypes.add(entity);
      }

      // Invalidate queries for each synced entity type
      for (const entity of entityTypes) {
        queryClient.invalidateQueries({ queryKey: [entity] });
      }

      // Show alert if there were failures
      if (failedItems.length > 0) {
        showBatchSyncFailures(
          failedItems.map(({ item, error }) => ({
            id: item.id,
            name: item.name,
            error,
            params: item.params as Record<string, unknown> | undefined,
          }))
        );
      }
    });
    return unsubscribe;
  }, [queryClient, showBatchSyncFailures]);

  // Subscribe to effective offline changes for queue flushing
  useEffect(() => {
    const unsubscribe = subscribeToEffectiveOfflineChanges((effectiveOffline) => {
      if (!effectiveOffline && shouldFlushNow(settings)) {
        void flushOfflineQueue(() => useSettingsStore.getState().settings);
      }
    });
    return unsubscribe;
  }, [settings]);

  // Also try to flush on settings change
  useEffect(() => {
    if (shouldFlushNow(settings)) {
      void flushOfflineQueue(() => settings);
    }
  }, [settings]);

  return null;
}
