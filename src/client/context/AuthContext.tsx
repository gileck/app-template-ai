import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    apiLogin,
    apiLogout,
    apiRegister,
    apiFetchCurrentUser
} from '@/apis/auth/client';
import { LoginRequest, RegisterRequest, UserResponse, CurrentUserResponse } from '@/apis/auth/types';

interface AuthContextType {
    user: UserResponse | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitialLoading: boolean;
    error: string | null;
    login: (credentials: LoginRequest) => Promise<boolean>;
    register: (data: RegisterRequest) => Promise<boolean>;
    logout: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Check auth status when the app loads
    const checkAuthStatus = useCallback(async () => {
        setIsInitialLoading(true);
        try {
            const response = await apiFetchCurrentUser({
                staleWhileRevalidate: true,
                //10 seconds  
                ttl: 10 * 1000,
                // 1 day
                maxStaleAge: 24 * 60 * 60 * 1000 * 7,
                isDataValidForCache: (data) => !!(data as CurrentUserResponse)?.user?.id,
            });
            if (response.data?.user) {
                setUser(response.data.user);
            } else {
                setUser(null);
            }
        } catch (err) {
            console.error("Auth check failed:", err);
            setUser(null);
        } finally {
            setIsInitialLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    // Login method
    const login = async (credentials: LoginRequest): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiLogin(credentials);
            if (response.data?.user) {
                setUser(response.data.user);
                return true;
            } else {
                setError(response.data?.error || 'Login failed');
                return false;
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login error');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Register method
    const register = async (data: RegisterRequest): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiRegister(data);
            if (response.data?.user) {
                setUser(response.data.user);
                return true;
            } else {
                setError(response.data?.error || 'Registration failed');
                return false;
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Registration error');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Logout method
    const logout = async (): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiLogout();
            if (response.data?.success) {
                setUser(null);
                return true;
            } else {
                setError(response.data?.error || 'Logout failed');
                return false;
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Logout error');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        isInitialLoading,
        error,
        login,
        register,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook for using auth context
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext; 