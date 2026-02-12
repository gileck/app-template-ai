/**
 * Design Mocks Route
 *
 * Public, full-screen route that renders agent-generated design mock pages.
 * Dynamically imports the mock page component based on the issue slug from the URL.
 * Mock files only exist on PR branches (Vercel previews), not on production.
 */

import { useRouter } from '@/client/features';
import React, { Component, Suspense, useMemo, type ReactNode } from 'react';
import { Skeleton } from '@/client/components/template/ui/skeleton';

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
        <MockErrorBoundary>
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen bg-background">
                    <Skeleton className="h-96 w-full max-w-md" />
                </div>
            }>
                <MockPage />
            </Suspense>
        </MockErrorBoundary>
    );
}
