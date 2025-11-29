/**
 * React Query hooks for fetching data
 * 
 * Note: Route-specific hooks are colocated with their routes.
 * This file contains only shared/cross-route query hooks.
 */

export {
    useCurrentUser,
    useInvalidateCurrentUser,
    currentUserQueryKey,
} from './useCurrentUser';
