import React, { useState } from 'react';
import { Button } from '@/client/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/client/components/ui/select';
import { Switch } from '@/client/components/ui/switch';
import { Card } from '@/client/components/ui/card';
import { Separator } from '@/client/components/ui/separator';
import { Alert } from '@/client/components/ui/alert';
import { LinearProgress } from '@/client/components/ui/linear-progress';
import { getAllModels } from '@/server/ai';
import { AIModelDefinition } from '@/server/ai/models';
import { useSettings } from '@/client/settings/SettingsContext';
import { localStorageCacheProvider } from '@/client/utils/localStorageCache';

interface SnackbarState { open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning'; }

export function Settings() {
  const { settings, updateSettings, clearCache } = useSettings();
  const [models] = useState<AIModelDefinition[]>(getAllModels());
  const [isClearing, setIsClearing] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info'
  });

  const handleModelChange = (value: string) => { updateSettings({ aiModel: value }); };

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

  // Close snackbar helper (not currently used by inline snackbar)
  // const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  return (
    <div className="mx-auto max-w-3xl py-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card className="mt-3 p-4">
        <h2 className="mb-2 text-lg font-medium">Cache Management</h2>
        <p className="mb-3 text-sm text-muted-foreground">Clear the application cache to fetch fresh data from AI models and external services. This will clear both server-side and local storage caches.</p>
        <Button onClick={handleClearCache} disabled={isClearing}>Clear Cache</Button>
        {isClearing && <LinearProgress className="mt-2" />}

        <Separator className="my-3" />

        <h2 className="mb-2 text-lg font-medium">Cache Behavior</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <Switch checked={settings.offlineMode} onCheckedChange={(v) => updateSettings({ offlineMode: v })} />
            <span>Offline Mode</span>
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={settings.staleWhileRevalidate} onCheckedChange={(v) => updateSettings({ staleWhileRevalidate: v })} />
            <span>Serve Stale While Revalidate</span>
          </label>
          <p className="text-sm text-muted-foreground">When SWR is ON, cached data will be served immediately when available while a background refresh runs.</p>
          <p className="text-sm text-muted-foreground">Offline Mode forces using cache and avoids relying on network.</p>
        </div>

        <h2 className="mt-4 mb-2 text-lg font-medium">AI Model</h2>
        <p className="mb-2 text-sm text-muted-foreground">Select the AI model to use for chat and other AI-powered features.</p>
        <Select value={settings.aiModel} onValueChange={handleModelChange}>
          <SelectTrigger>
            <SelectValue placeholder="AI Model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name} ({model.provider})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {snackbar.open && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2">
          <Alert variant={snackbar.severity === 'success' ? 'success' : snackbar.severity === 'warning' ? 'warning' : snackbar.severity === 'info' ? 'info' : 'destructive'}>
            {snackbar.message}
          </Alert>
        </div>
      )}
    </div>
  );
}
