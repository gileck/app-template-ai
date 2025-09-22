import "@/client/styles/globals.css";
import type { AppProps } from "next/app";
import { AuthProvider } from "@/client/context/AuthContext";
import { SettingsProvider } from "@/client/settings/SettingsContext";
import { AppThemeProvider } from "@/client/components/ThemeProvider";
import AuthWrapper from "@/client/components/auth/AuthWrapper";
import dynamic from 'next/dynamic';
import { routes } from '@/client/routes';
import { Layout } from '@/client/components/Layout';
import { useEffect } from 'react';
import { useSettings } from '@/client/settings/SettingsContext';
import { initializeApiClient } from '@/client/utils/apiClient';
import { flushOfflineQueue, shouldFlushNow } from '@/client/utils/offlinePostQueue';

const RouterProvider = dynamic(() => import('@/client/router/index').then(module => module.RouterProvider), { ssr: false });

export default function App({ }: AppProps) {
  return (
    <SettingsProvider>
      <ApiClientInitializer />
      <AppThemeProvider>
        <AuthProvider>
          <AuthWrapper>
            <RouterProvider routes={routes}>
              {RouteComponent => <Layout><RouteComponent /></Layout>}
            </RouterProvider>
          </AuthWrapper>
        </AuthProvider>
      </AppThemeProvider>
    </SettingsProvider>
  );
}

function ApiClientInitializer() {
  const { settings, subscribeToEffectiveOfflineChanges } = useSettings();
  useEffect(() => {
    initializeApiClient(() => settings);
  }, [settings]);
  useEffect(() => {
    if (!subscribeToEffectiveOfflineChanges) return;
    const unsubscribe = subscribeToEffectiveOfflineChanges((effectiveOffline) => {
      if (!effectiveOffline && shouldFlushNow(settings)) {
        void flushOfflineQueue(() => settings);
      }
    });
    return unsubscribe;
  }, [settings, subscribeToEffectiveOfflineChanges]);
  return null;
}
