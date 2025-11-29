/**
 * Auth Feature
 * 
 * Authentication with instant-boot support for PWA.
 */

// Store
export {
    useAuthStore,
    useIsAuthenticated,
    useIsProbablyLoggedIn,
    useUser,
    useUserHint,
} from './store';

// Hooks
export {
    useAuthValidation,
    useLogin,
    useRegister,
    useLogout,
    useCurrentUser,
    useInvalidateCurrentUser,
    currentUserQueryKey,
} from './hooks';

// Components
export { default as AuthWrapper } from './AuthWrapper';
export { LoginForm } from './LoginForm';

// Types
export type { UserPublicHint, LoginFormState, LoginFormErrors } from './types';
export { userToHint } from './types';

