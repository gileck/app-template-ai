import React, { useState } from 'react';
import { create } from 'zustand';
import { Alert, AlertTitle, AlertDescription } from '@/client/components/ui/alert';
import { Button } from '@/client/components/ui/button';
import { ChevronDown, ChevronUp, X, AlertTriangle } from 'lucide-react';

/**
 * Batch sync failure item
 */
export interface BatchSyncFailure {
    id: string;
    name: string;
    error: string;
    params?: Record<string, unknown>;
}

/**
 * Store for batch sync alert state
 */
interface BatchSyncAlertState {
    failures: BatchSyncFailure[];
    isVisible: boolean;
    showFailures: (failures: BatchSyncFailure[]) => void;
    dismiss: () => void;
}

export const useBatchSyncAlertStore = create<BatchSyncAlertState>((set) => ({
    failures: [],
    isVisible: false,
    showFailures: (failures) => set({ failures, isVisible: failures.length > 0 }),
    dismiss: () => set({ isVisible: false, failures: [] }),
}));

/**
 * Global batch sync alert component
 * Shows when offline mutations fail to sync
 */
export const BatchSyncAlert: React.FC = () => {
    const { failures, isVisible, dismiss } = useBatchSyncAlertStore();
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral expand/collapse state
    const [isExpanded, setIsExpanded] = useState(false);

    if (!isVisible || failures.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg">
            <Alert variant="warning" className="relative shadow-lg">
                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 h-6 w-6 p-0"
                    onClick={dismiss}
                >
                    <X className="h-4 w-4" />
                </Button>

                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="pr-8">
                    Sync Failed: {failures.length} operation{failures.length > 1 ? 's' : ''} could not be synced
                </AlertTitle>
                <AlertDescription>
                    <p className="mb-2 text-sm">
                        Some offline changes failed to sync with the server.
                    </p>

                    <Button
                        variant="outline"
                        size="sm"
                        className="mb-2"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="mr-1 h-4 w-4" />
                                Hide Details
                            </>
                        ) : (
                            <>
                                <ChevronDown className="mr-1 h-4 w-4" />
                                Show Details
                            </>
                        )}
                    </Button>

                    {isExpanded && (
                        <div className="mt-2 max-h-48 overflow-y-auto rounded border bg-background/50 p-2">
                            {failures.map((failure, index) => (
                                <div
                                    key={failure.id}
                                    className={`text-xs ${index > 0 ? 'mt-2 border-t pt-2' : ''}`}
                                >
                                    <div className="font-medium text-foreground">
                                        {failure.name}
                                    </div>
                                    <div className="text-destructive">
                                        {failure.error}
                                    </div>
                                    {failure.params && (
                                        <div className="mt-1 text-muted-foreground">
                                            <code className="text-xs">
                                                {JSON.stringify(failure.params, null, 0).slice(0, 100)}
                                                {JSON.stringify(failure.params).length > 100 ? '...' : ''}
                                            </code>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </AlertDescription>
            </Alert>
        </div>
    );
};

