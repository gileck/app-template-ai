import React, { ReactNode, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { useSettings } from '../settings/SettingsContext';

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const { settings } = useSettings();

  const theme = useMemo(() => {
    return createTheme({
      palette: {
        mode: settings.theme,
        primary: {
          main: '#1976d2',
        },
        secondary: {
          main: '#dc004e',
        },
      },
    });
  }, [settings.theme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}; 