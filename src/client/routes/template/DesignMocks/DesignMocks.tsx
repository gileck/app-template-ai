/**
 * Design Mocks Route
 *
 * Public, full-screen route that renders agent-generated design mock pages.
 * Dynamically imports the mock page component based on the issue slug from the URL.
 * Mock files only exist on PR branches (Vercel previews), not on production.
 *
 * Provides a toolbar to toggle view state (populated/empty/loading) and color mode (light/dark).
 * These are passed as props to the mock page component.
 */

import { useRouter } from '@/client/features';
import React, { Component, Suspense, useMemo, useState, type ReactNode } from 'react';
import { Skeleton } from '@/client/components/template/ui/skeleton';
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/client/components/template/ui/select';
import { Moon, Sun } from 'lucide-react';

export type ViewState = 'populated' | 'empty' | 'loading';
export type ColorMode = 'light' | 'dark';

class MockErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
                    <p className="text-muted-foreground">Design mock not available.</p>
                </div>
            );
        }
        return this.props.children;
    }
}

export function DesignMocks() {
    const { routeParams } = useRouter();
    const issueSlug = routeParams.issueSlug; // e.g. "issue-147"
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral UI controls for mock preview toolbar
    const [viewState, setViewState] = useState<ViewState>('populated');
    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral UI control for color mode toggle
    const [colorMode, setColorMode] = useState<ColorMode>('light');

    const MockPage = useMemo(() => {
        if (!issueSlug) return null;
        return React.lazy(() => import(`@/pages/design-mocks/${issueSlug}`));
    }, [issueSlug]);

    if (!issueSlug || !MockPage) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
                <p className="text-muted-foreground">No design mock specified.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="sticky top-0 z-50 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 py-2">
                <Select value={viewState} onValueChange={(v) => setViewState(v as ViewState)}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="populated">Populated</SelectItem>
                        <SelectItem value="empty">Empty State</SelectItem>
                        <SelectItem value="loading">Loading State</SelectItem>
                    </SelectContent>
                </Select>
                <button
                    onClick={() => setColorMode(m => m === 'light' ? 'dark' : 'light')}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-xs text-foreground hover:bg-muted transition-colors"
                >
                    {colorMode === 'light' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                    {colorMode === 'light' ? 'Light' : 'Dark'}
                </button>
            </div>
            <div className={colorMode === 'dark' ? 'dark' : ''}>
                <MockErrorBoundary>
                    <Suspense fallback={
                        <div className="flex items-center justify-center min-h-screen bg-background">
                            <Skeleton className="h-96 w-full max-w-md" />
                        </div>
                    }>
                        <MockPage viewState={viewState} colorMode={colorMode} />
                    </Suspense>
                </MockErrorBoundary>
            </div>
        </div>
    );
}
