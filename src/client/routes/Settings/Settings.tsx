import React, { useState } from 'react';
import {
  Typography,
  Container,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Divider,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { getAllModels } from '@/server/ai';
import { AIModelDefinition } from '@/server/ai/models';
import { useSettings } from '@/client/settings/SettingsContext';
import { localStorageCacheProvider } from '@/client/utils/localStorageCache';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

export function Settings() {
  const { settings, updateSettings, clearCache } = useSettings();
  const [models] = useState<AIModelDefinition[]>(getAllModels());
  const [isClearing, setIsClearing] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info'
  });

  const handleModelChange = (event: SelectChangeEvent) => {
    updateSettings({ aiModel: event.target.value });
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // Clear server-side cache
      const result = await clearCache();

      // Clear localStorage cache
      const localStorageCleared = await localStorageCacheProvider.clearAllCache();

      // Determine overall success and message
      const overallSuccess = result.success && localStorageCleared;
      let message = result.message;

      if (result.success && localStorageCleared) {
        message = 'All caches cleared successfully';
      } else if (result.success && !localStorageCleared) {
        message = 'Server cache cleared, but failed to clear local cache';
      } else if (!result.success && localStorageCleared) {
        message = 'Local cache cleared, but failed to clear server cache';
      } else {
        message = 'Failed to clear both server and local caches';
      }

      setSnackbar({
        open: true,
        message,
        severity: overallSuccess ? 'success' : 'warning'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        severity: 'error'
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Cache Management
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Clear the application cache to fetch fresh data from AI models and external services. This will clear both server-side and local storage caches.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleClearCache}
          disabled={isClearing}
          startIcon={isClearing ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isClearing ? 'Clearing...' : 'Clear Cache'}
        </Button>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Cache Behavior
        </Typography>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <FormControlLabel
            control={<Switch checked={settings.offlineMode} onChange={(e) => updateSettings({ offlineMode: e.target.checked })} />}
            label="Offline Mode"
          />
          <FormControlLabel
            control={<Switch checked={settings.staleWhileRevalidate} onChange={(e) => updateSettings({ staleWhileRevalidate: e.target.checked })} />}
            label="Serve Stale While Revalidate"
          />
          <Typography variant="body2" color="text.secondary">
            When SWR is ON, cached data will be served immediately when available while a background refresh runs.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Offline Mode forces using cache and avoids relying on network.
          </Typography>
        </FormControl>

        <Typography variant="h6" gutterBottom>
          AI Model
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Select the AI model to use for chat and other AI-powered features.
        </Typography>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="ai-model-select-label">AI Model</InputLabel>
          <Select
            labelId="ai-model-select-label"
            id="ai-model-select"
            value={settings.aiModel}
            label="AI Model"
            onChange={handleModelChange}
          >
            {models.map((model) => (
              <MenuItem key={model.id} value={model.id}>
                {model.name} ({model.provider})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
