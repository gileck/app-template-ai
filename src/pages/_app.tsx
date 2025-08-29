import "@/client/styles/globals.css";
import type { AppProps } from "next/app";
import { AuthProvider } from "@/client/context/AuthContext";
import { SettingsProvider } from "@/client/settings/SettingsContext";
import { AppThemeProvider } from "@/client/components/ThemeProvider";
import AuthWrapper from "@/client/components/auth/AuthWrapper";
import dynamic from 'next/dynamic';
import { routes } from '@/client/routes';
import { Layout } from '@/client/components/Layout';

const RouterProvider = dynamic(() => import('@/client/router/index').then(module => module.RouterProvider), { ssr: false });

export default function App({ }: AppProps) {
  return (
    <SettingsProvider>
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
