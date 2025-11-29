import React, { useState } from 'react';
import { useAuthStore } from '@/client/stores';
import { useLogin, useRegister } from '@/client/hooks/mutations';
import { Button } from '@/client/components/ui/button';
import { Input } from '@/client/components/ui/input';
import { Label } from '@/client/components/ui/label';
import { Alert } from '@/client/components/ui/alert';
import { LinearProgress } from '@/client/components/ui/linear-progress';
import { useLoginFormValidator } from './useLoginFormValidator';
import { LoginFormState } from './types';

export const LoginForm = () => {
    // Use Zustand store for error state
    const error = useAuthStore((state) => state.error);
    const setError = useAuthStore((state) => state.setError);

    // Use React Query mutations for login/register
    const loginMutation = useLogin();
    const registerMutation = useRegister();

    const isLoading = loginMutation.isPending || registerMutation.isPending;

    // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral form mode toggle
    const [isRegistering, setIsRegistering] = useState(false);
    // eslint-disable-next-line state-management/prefer-state-architecture -- form input before submission
    const [formData, setFormData] = useState<LoginFormState>({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const { formErrors, validateForm, clearFieldError, resetFormErrors } = useLoginFormValidator(isRegistering, formData);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        clearFieldError(name as keyof LoginFormState);
        // Clear all errors when user starts typing
        if (error || loginMutation.error || registerMutation.error) {
            setError(null);
            loginMutation.reset();
            registerMutation.reset();
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }

        if (isRegistering) {
            const registerData = {
                username: formData.username,
                password: formData.password,
                ...(formData.email.trim() && { email: formData.email })
            };
            registerMutation.mutate(registerData);
        } else {
            loginMutation.mutate({
                username: formData.username,
                password: formData.password
            });
        }
    };

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        resetFormErrors();
        setError(null);
        // Reset React Query mutations to clear stale errors
        loginMutation.reset();
        registerMutation.reset();
    };

    // Combine errors from mutations and store
    const displayError = error ||
        (loginMutation.error instanceof Error ? loginMutation.error.message : null) ||
        (registerMutation.error instanceof Error ? registerMutation.error.message : null);

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-3">
            {displayError && (
                <Alert variant="destructive" className="mb-2">
                    {displayError}
                </Alert>
            )}

            <div className="space-y-1">
                <Label htmlFor="username">Username</Label>
                <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={isLoading}
                    aria-invalid={!!formErrors.username}
                    aria-describedby="username-error"
                />
                {formErrors.username && (
                    <p id="username-error" className="text-xs text-destructive">{formErrors.username}</p>
                )}
            </div>

            {isRegistering && (
                <div className="space-y-1">
                    <Label htmlFor="email">Email Address (Optional)</Label>
                    <Input
                        id="email"
                        name="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isLoading}
                        aria-invalid={!!formErrors.email}
                        aria-describedby="email-error"
                    />
                    {formErrors.email && (
                        <p id="email-error" className="text-xs text-destructive">{formErrors.email}</p>
                    )}
                </div>
            )}

            <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    aria-invalid={!!formErrors.password}
                    aria-describedby="password-error"
                />
                {formErrors.password && (
                    <p id="password-error" className="text-xs text-destructive">{formErrors.password}</p>
                )}
            </div>

            {isRegistering && (
                <div className="space-y-1">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        disabled={isLoading}
                        aria-invalid={!!formErrors.confirmPassword}
                        aria-describedby="confirmPassword-error"
                    />
                    {formErrors.confirmPassword && (
                        <p id="confirmPassword-error" className="text-xs text-destructive">{formErrors.confirmPassword}</p>
                    )}
                </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isRegistering ? 'Register' : 'Sign In'}
            </Button>
            {isLoading && <LinearProgress className="mt-2" />}

            <div className="text-center">
                <button
                    type="button"
                    className="text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50"
                    onClick={toggleMode}
                    disabled={isLoading}
                >
                    {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register"}
                </button>
            </div>
        </form>
    );
};
