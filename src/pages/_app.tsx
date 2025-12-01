import "@/client/styles/globals.css";
import type { AppProps } from "next/app";
import { AppThemeProvider } from "@/client/components/ThemeProvider";
import dynamic from 'next/dynamic';
import { routes } from '@/client/routes';
import { Layout } from '@/client/components/Layout';
import { useEffect } from 'react';
import { QueryProvider } from '@/client/query';
import {
  AuthWrapper,
  useSettingsStore,
  initializeOfflineListeners,
  BatchSyncAlert,
  useOfflineSyncInitializer
} from '@/client/features';
import { initializeApiClient } from '@/client/utils/apiClient';

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
 * - Offline sync queue management (via useOfflineSyncInitializer)
 */
function AppInitializer() {
  // Initialize offline listeners on mount
  useEffect(() => {
    const cleanup = initializeOfflineListeners();
    return cleanup;
  }, []);

  // Initialize API client with settings getter
  useEffect(() => {
    initializeApiClient(() => useSettingsStore.getState().settings);
  }, []);

  // Initialize offline sync system (queue flushing, alerts, cache invalidation)
  useOfflineSyncInitializer();

  return null;
}
