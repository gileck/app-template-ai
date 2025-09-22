import React, { ReactNode, useEffect } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useSettings } from '../settings/SettingsContext';

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const { settings } = useSettings();

  // Sync next-themes with app settings
  useEffect(() => {
    // next-themes reads class on html; we rely on attribute "class" toggling
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  return (
    <NextThemesProvider attribute="class" defaultTheme={settings.theme} enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
};