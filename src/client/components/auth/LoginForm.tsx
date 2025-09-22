import React, { useState } from 'react';
import { useAuth } from '@/client/context/AuthContext';
import { Button } from '@/client/components/ui/button';
import { Input } from '@/client/components/ui/input';
import { Label } from '@/client/components/ui/label';
import { Alert } from '@/client/components/ui/alert';
import { LinearProgress } from '@/client/components/ui/linear-progress';
import { useLoginFormValidator } from './useLoginFormValidator';
import { LoginFormState } from './types';

export const LoginForm = () => {
    const { login, register, isLoading, error } = useAuth();
    const [isRegistering, setIsRegistering] = useState(false);
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
            await register(registerData);
        } else {
            await login({
                username: formData.username,
                password: formData.password
            });
        }
    };

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        resetFormErrors();
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-3">
            {error && (
                <Alert variant="destructive" className="mb-2">
                    {error}
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