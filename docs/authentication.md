# Authentication System Documentation

This document explains the authentication system, including the instant-boot pattern for PWA support.

## Architecture Overview

The authentication system uses:

1. **Zustand Store** (`authStore`) - Client-side auth state with localStorage persistence
2. **React Query** - Server data caching with IndexedDB persistence  
3. **HttpOnly Cookies** - Secure JWT token storage (server-side)

```
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layers                            │
├─────────────────────────────────────────────────────────────┤
│  localStorage (Zustand)     │  IndexedDB (React Query)       │
│  - isProbablyLoggedIn       │  - /me response cache          │
│  - userPublicHint           │  - All query data              │
│  - hintTimestamp            │                                │
├─────────────────────────────────────────────────────────────┤
│  HttpOnly Cookie (Server)                                    │
│  - JWT auth token (secure, not accessible to JS)             │
└─────────────────────────────────────────────────────────────┘
```

## Instant Boot Pattern

The app is designed to start instantly, even after iOS kills it in the background. This is achieved by:

1. **Persisting a "hint"** that the user is probably logged in
2. **Showing the app shell immediately** based on this hint
3. **Validating in background** with the server

### Why This Matters

Without instant boot:
```
App Start → Loading spinner (2-3 sec) → App renders
```

With instant boot:
```
App Start → App renders immediately → Background validation
```

## Auth Flow: First Time User

```
App Start
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  QueryProvider: WaitForCacheRestore                          │
│  IndexedDB is empty → completes immediately                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Zustand hydrates from localStorage                          │
│  isProbablyLoggedIn = false (no hint stored)                 │
│  userPublicHint = null                                       │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  AuthWrapper renders                                         │
│  isProbablyLoggedIn = false                                  │
│  → Shows Login Dialog immediately                            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  User logs in via LoginForm                                  │
│  useLogin() mutation calls server                            │
│  Server validates, sets HttpOnly JWT cookie                  │
│  Returns user data                                           │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  On success:                                                 │
│  - Zustand: isProbablyLoggedIn=true, userPublicHint={...}   │
│  - React Query: caches /me response to IndexedDB             │
│  - App renders authenticated UI                              │
└─────────────────────────────────────────────────────────────┘
```

## Auth Flow: Returning User (Instant Boot)

```
App Start (e.g., after iOS killed the app)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  QueryProvider: WaitForCacheRestore (~50-100ms)              │
│  Restores React Query cache from IndexedDB                   │
│  /me response is now in memory                               │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Zustand hydrates from localStorage (instant, sync)          │
│  isProbablyLoggedIn = true                                   │
│  userPublicHint = { name: "Gil", email: "...", avatar: "..." }│
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  AuthWrapper renders                                         │
│  isProbablyLoggedIn = true                                   │
│  → Shows App Shell immediately                               │
│  → TopNavBar shows avatar/name from userPublicHint           │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  useAuthValidation() runs in background                      │
│  Calls /me endpoint via React Query                          │
│  May serve cached response first (stale-while-revalidate)    │
└─────────────────────────────────────────────────────────────┘
    │
    ├─── If valid ──────────────────────────────────────────────┐
    │    - Updates user state with fresh data                   │
    │    - Refreshes hint for next boot                         │
    │    - User continues using app normally                    │
    │                                                           │
    └─── If 401 (session expired) ─────────────────────────────┐
         - Calls clearAuth()                                    │
         - Clears isProbablyLoggedIn and userPublicHint        │
         - Shows Login Dialog                                   │
         - User sees brief flash then login prompt              │
```

## Key Components

### Zustand Auth Store (`src/client/features/auth/store.ts`)

```typescript
interface AuthState {
    // Persisted (localStorage) - for instant boot
    isProbablyLoggedIn: boolean;      // Hint: user was logged in
    userPublicHint: UserPublicHint;   // Name, email, avatar for UI
    hintTimestamp: number;            // TTL check (7 days)
    
    // Runtime only (not persisted)
    user: UserResponse | null;        // Full validated user
    isValidated: boolean;             // Server confirmed auth
    isValidating: boolean;            // Validation in progress
    
    // Actions
    setUserHint(hint): void;
    setValidatedUser(user): void;
    clearAuth(): void;
}
```

### Auth Hooks (`src/client/features/auth/hooks.ts`)

All auth-related hooks in one file:
- `useAuthValidation()` - Background validation pattern
- `useLogin()` - Login mutation, updates Zustand on success
- `useRegister()` - Registration mutation
- `useLogout()` - Clears auth state and React Query cache
- `useCurrentUser()` - Fetches current user via React Query

### AuthWrapper (`src/client/features/auth/AuthWrapper.tsx`)

Guards the app based on auth state:
- If `isProbablyLoggedIn` → render app immediately (instant boot)
- If `isAuthenticated` (validated) → render app
- Otherwise → show login dialog

## Server-Side Authentication

### JWT Token Flow

1. **Login/Register**: Server validates credentials, generates JWT, sets HttpOnly cookie
2. **API Requests**: Cookie automatically sent with every request
3. **Validation**: `processApiCall` middleware extracts and verifies JWT
4. **Context**: User ID passed to API handlers for authorization

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `auth/login` | POST | Authenticate user, set JWT cookie |
| `auth/register` | POST | Create user, set JWT cookie |
| `auth/me` | GET | Get current user (validates token) |
| `auth/logout` | POST | Clear JWT cookie |

### Security Notes

- JWT tokens stored in **HttpOnly cookies** (not accessible to JavaScript)
- `isProbablyLoggedIn` is just a UI hint, not actual auth
- Real authentication is always validated server-side
- Token expiry handled by server, client just responds to 401

## TTL (Time-to-Live) Settings

| Data | TTL | Purpose |
|------|-----|---------|
| Auth hint (Zustand) | 7 days | Clear stale hints after inactivity |
| React Query cache | 24 hours | IndexedDB persistence max age |
| JWT token | Server-defined | Actual session expiry |

## Usage Examples

### Checking Auth State in Components

```typescript
import { useAuthStore, useUser, useIsAuthenticated } from '@/client/features/auth';

function MyComponent() {
    // Get validated user
    const user = useUser();
    
    // Check if fully authenticated
    const isAuthenticated = useIsAuthenticated();
    
    // Or for instant-boot UI (before validation)
    const userHint = useAuthStore((s) => s.userPublicHint);
    const isProbablyLoggedIn = useAuthStore((s) => s.isProbablyLoggedIn);
}
```

### Performing Login

```typescript
import { useLogin } from '@/client/features/auth';

function LoginForm() {
    const loginMutation = useLogin();
    
    const handleSubmit = (credentials) => {
        loginMutation.mutate(credentials, {
            onSuccess: () => {
                // User is now logged in
                // Zustand and React Query are automatically updated
            },
            onError: (error) => {
                // Show error message
            }
        });
    };
}
```

### Performing Logout

```typescript
import { useLogout } from '@/client/features/auth';

function LogoutButton() {
    const logoutMutation = useLogout();
    
    return (
        <button onClick={() => logoutMutation.mutate()}>
            Logout
        </button>
    );
}
```

## Troubleshooting

### User sees login briefly then app loads
This is normal when the session was valid. The `isProbablyLoggedIn` hint enables showing the app shell while validation runs in background.

### User stuck on loading
Check if `WaitForCacheRestore` is blocking. IndexedDB restoration should be <100ms.

### Auth state not persisting
- Check localStorage for `auth-storage` key (Zustand)
- Check IndexedDB for React Query cache
- Verify `hintTimestamp` hasn't expired (7 days)

### 401 errors after app restart
Session may have expired server-side. This is handled gracefully - user sees app briefly, then login dialog.
