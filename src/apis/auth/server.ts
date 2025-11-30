import { UserResponse } from './types';
import { User } from '@/server/database/collections/users/types';

// Export constants and utility functions to be used by handlers
export const SALT_ROUNDS = 10;

if (!process.env.JWT_SECRET) {
    console.error('[AUTH ERROR] JWT_SECRET environment variable is not set. Authentication will not work.');
    throw new Error('JWT_SECRET environment variable is required');
}
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = '7d';
export const COOKIE_NAME = 'auth_token';
export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
};

export const sanitizeUser = (user: User): UserResponse => {
    return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        profilePicture: user.profilePicture
    };
};

// Import and re-export handlers from the handlers directory
export { registerUser } from './handlers/registerUser';
export { loginUser } from './handlers/loginUser';
export { getCurrentUser } from './handlers/getCurrentUser';
export { updateUserProfile } from './handlers/updateUserProfile';
export { logoutUser } from './handlers/logoutUser';

// Export API endpoint names and types from index.ts as per guidelines
export * from './index';

