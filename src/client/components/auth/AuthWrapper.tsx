import React from 'react';
import { useAuthStore, useIsProbablyLoggedIn } from '@/client/stores';
import { useAuthValidation } from '@/client/hooks/useAuthValidation';
import { LoginForm } from './LoginForm';
import { LinearProgress } from '@/client/components/ui/linear-progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/client/components/ui/dialog';

interface AuthWrapperProps {
    children: React.ReactNode;
}

/**
 * AuthWrapper component that handles the instant-boot auth pattern:
 * 
 * 1. On mount, Zustand hydrates `isProbablyLoggedIn` from localStorage
 * 2. If `isProbablyLoggedIn`, show authenticated shell immediately (no loading state)
 * 3. Background validation runs via useAuthValidation
 * 4. If validation fails, shows login dialog
 * 
 * This provides instant app startup even after iOS kills the app.
 */
const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
    // Get persistent hint from Zustand
    const isProbablyLoggedIn = useIsProbablyLoggedIn();

    // Run background auth validation
    const { isAuthenticated, isValidating } = useAuthValidation();

    // Get the validated state from the store
    const isValidated = useAuthStore((state) => state.isValidated);

    // If we have a hint that user is logged in, show the app immediately
    // This enables instant boot - the UI appears before validation completes
    if (isProbablyLoggedIn && !isValidated) {
        // Show app shell while validating in background
        // Only show a subtle loading indicator, not a blocking one
        return (
            <>
                {isValidating && (
                    <div className="fixed top-0 left-0 right-0 z-50">
                        <LinearProgress className="h-0.5" />
                    </div>
                )}
                {children}
            </>
        );
    }

    // If validation completed and user is authenticated
    if (isAuthenticated) {
        return <>{children}</>;
    }

    // If we don't have a hint and validation is still running
    // This only happens on first load without any cached auth hint
    if (isValidating && !isProbablyLoggedIn) {
        return (
            <div className="w-full py-2">
                <div className="mx-auto max-w-screen-lg">
                    <LinearProgress />
                </div>
            </div>
        );
    }

    // Not authenticated - show login dialog
    return (
        <Dialog open>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Sign In</DialogTitle>
                </DialogHeader>
                <LoginForm />
            </DialogContent>
        </Dialog>
    );
};

export default AuthWrapper;
