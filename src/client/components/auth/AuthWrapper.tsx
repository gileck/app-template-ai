import React from 'react';
import { useAuth } from '@/client/context/AuthContext';
import { LoginForm } from './LoginForm';
import { LinearProgress } from '@/client/components/ui/linear-progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/client/components/ui/dialog';

interface AuthWrapperProps {
    children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
    const { isAuthenticated, isInitialLoading } = useAuth();

    if (isInitialLoading) {
        return (
            <div className="w-full py-2">
                <div className="mx-auto max-w-screen-lg">
                    <LinearProgress />
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
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
    }

    return <>{children}</>;
};

export default AuthWrapper; 