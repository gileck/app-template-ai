# Authentication System Documentation

This document explains how user authentication should work in our application, covering both client-side and server-side aspects, and providing code examples to help understand the flow of data.

## Overall Architecture

The authentication system uses a JWT (JSON Web Token) based authentication flow with the following components:

1. **Client-side components**:
   - `AuthProvider`: Context provider for auth state
   - `AuthWrapper`: Component that guards authenticated routes
   - `LoginForm`: UI component for login/registration

2. **Server-side components**:
   - Authentication API endpoints (login, register, logout, getCurrentUser)
   - JWT token validation middleware
   - Cookie-based token storage

## Authentication Flow in `index.tsx`

Here's how authentication is structured in our main application entry point:

```tsx
export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SettingsProvider>
          <AuthWrapper>
            <RouterProvider routes={routes}>
              {Component => <Layout><Component /></Layout>}
            </RouterProvider>
          </AuthWrapper>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

The important parts of this structure are:

1. `<AuthProvider>`: Wraps the entire application, providing auth state and methods
2. `<AuthWrapper>`: Protects the router, ensuring only authenticated users access routes
3. The nested structure ensures that authenticated routes have access to both auth and settings context

## Context Providers Explained

### AuthProvider

The `AuthProvider` is responsible for:

1. Managing the authentication state (user data, loading state, errors)
2. Providing authentication methods (login, register, logout)
3. Checking auth status when the application loads

```tsx
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Check auth status when the app loads
    const checkAuthStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiFetchCurrentUser();
            if (response.data?.user) {
                setUser(response.data.user);
            } else {
                setUser(null);
            }
        } catch (err) {
            console.error("Auth check failed:", err);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    // Auth methods: login, register, logout
    const login = async (credentials: LoginRequest): Promise<boolean> => {
        setIsLoading(true);
        try {
            const response = await apiLogin(credentials);
            if (response.data?.user) {
                setUser(response.data.user);
                return true;
            } else {
                setError(response.data?.error || 'Login failed');
                return false;
            }
        } catch (err) {
            setError('Login error');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Similar implementations for register and logout...

    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        error
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
```

### AuthWrapper

The `AuthWrapper` component:

1. Blocks access to the application until auth state is determined
2. Redirects unauthenticated users to a login modal
3. Only renders children (the actual app) when user is authenticated

```tsx
const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        // Show loading state or nothing
        return <></>;
    }

    if (!isAuthenticated) {
        // Show login modal
        return (
            <Modal open={true}>
                <Paper>
                    <Typography variant="h5">Welcome</Typography>
                    <LoginForm />
                </Paper>
            </Modal>
        );
    }

    // User is authenticated, render the app
    return <>{children}</>;
};
```


## Client-Side Authentication

### Authentication Hook Usage

Components can access authentication state and methods using the `useAuth` hook:

```tsx
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
    const { user, isAuthenticated, login, logout } = useAuth();
    
    return (
        <div>
            {isAuthenticated ? (
                <>
                    <p>Welcome, {user?.username}!</p>
                    <button onClick={logout}>Logout</button>
                </>
            ) : (
                <button onClick={() => login({ email: 'test@example.com', password: 'password' })}>
                    Login
                </button>
            )}
        </div>
    );
};
```

### Login Form

The `LoginForm` component handles user input for both login and registration:

```tsx
const LoginForm: React.FC = () => {
    const { login, register, isLoading, error } = useAuth();
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isRegistering) {
            await register({ username, email, password });
        } else {
            await login({ email, password });
        }
    };

    // Form JSX...
};
```

## Server-Side Authentication

### Authentication API Endpoints

The server exposes several authentication endpoints through a unified API layer:

1. `auth/register`: Creates a new user account (via `/api/process/auth_register`)
2. `auth/login`: Authenticates a user and issues a JWT token (via `/api/process/auth_login`)
3. `auth/me`: Gets the current authenticated user (via `/api/process/auth_me`)
4. `auth/logout`: Logs the user out by clearing the auth token (via `/api/process/auth_logout`)

Note: All API names use slashes internally (e.g., `auth/me`), but in the actual HTTP requests, the slashes are replaced with underscores (e.g., `/api/process/auth_me`). This conversion is handled automatically by the client API utilities.

### API Implementation

Authentication endpoints are implemented in `src/apis/auth/server.ts`:

```tsx
// Registration endpoint
export const registerUser = async (request: RegisterRequest, context: ApiHandlerContext): Promise<RegisterResponse> => {
    try {
        // Validate input
        if (!request.username || !request.email || !request.password) {
            return { error: "Required fields missing" };
        }

        // Check for existing user
        const existingUser = await users.findUserByEmail(request.email);
        if (existingUser) {
            return { error: "Email already exists" };
        }

        // Hash password and create user
        const passwordHash = await bcrypt.hash(request.password, SALT_ROUNDS);
        const newUser = await users.insertUser({
            username: request.username,
            email: request.email,
            password_hash: passwordHash,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser._id.toHexString() },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Set auth cookie
        context.setCookie(COOKIE_NAME, token, COOKIE_OPTIONS);

        return { user: sanitizeUser(newUser) };
    } catch (error) {
        console.error("Registration error:", error);
        return { error: "Registration failed" };
    }
};

// Similar implementations for login, getCurrentUser, and logout...
```

### Token Authentication Middleware

Authentication state is passed to API handlers through middleware in `processApiCall.ts`:

```tsx
export const processApiCall = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<CacheResult<unknown>> => {
  // Parse API name from URL parameter (underscores are converted to slashes)
  const nameParam = req.query.name as string;
  const name = nameParam.replace(/_/g, '/');
  const params = req.body.params;
  const options = req.body.options;

  // Extract and verify JWT token from cookies
  let userId = undefined;
  const cookies = parse(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];

  if (token) {
    try {
      // Verify and decode the token
      const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
      userId = decoded.userId;
    } catch (err) {
      // Invalid token - clear it
      console.warn('Invalid auth token:', err);
      res.setHeader('Set-Cookie', serialize(COOKIE_NAME, '', { 
          path: '/', 
          expires: new Date(0) 
      }));
    }
  }

  // Create context with auth info and cookie helpers
  const context: ApiHandlerContext = {
    userId,
    getCookieValue: (name) => cookies[name],
    setCookie: (name, value, options) => {
      res.setHeader('Set-Cookie', serialize(name, value, options || {}));
    },
    clearCookie: (name, options) => {
      res.setHeader('Set-Cookie', serialize(name, '', { 
          ...options, 
          path: '/', 
          expires: new Date(0) 
      }));
    }
  };

  // Call the API handler with context
  const apiHandler = apiHandlers[name];
  const result = await withCache(
    () => apiHandler.process(params, context),
    {
      key: name,
      params: { ...params, userId },
    },
    options
  );

  return result;
};
```

## How User Authentication Data Flows

1. **Initial Load**:
   - `AuthProvider` mounts and calls `checkAuthStatus()`
   - Sends request to `/api/process/auth_me` endpoint
   - If a valid token exists in cookies, server returns user data
   - `AuthProvider` updates context with user data

2. **Login Flow**:
   - User submits credentials in `LoginForm`
   - `login()` method from `AuthContext` is called
   - API request to `/api/process/auth_login` endpoint
   - Server validates credentials and sets JWT cookie
   - Response returns user data
   - `AuthProvider` updates context with user data

3. **Protected Routes**:
   - `AuthWrapper` uses auth context to check `isAuthenticated`
   - If not authenticated, shows login modal
   - If authenticated, renders protected routes

4. **API Requests**:
   - JWT token is automatically included in cookies with every request
   - `processApiCall` middleware extracts and verifies token
   - User ID is passed to API handlers via context
   - API handlers can use user ID for authorization

## Implementing this Pattern in a New App

To implement this authentication pattern in a new application:

1. **Create the Auth API Endpoints**:
   - Define types in a `types.ts` file
   - Create login, register, getCurrentUser, and logout endpoints
   - Implement JWT generation and validation
   - Use HTTP-only cookies for token storage

2. **Create the Auth Context**:
   - Implement state for user data, loading, and errors
   - Create methods for login, register, logout
   - Add initial auth check on component mount
   - Provide the auth context to your app

3. **Create the Auth Wrapper Component**:
   - Use the auth context to check authentication status
   - Show login UI for unauthenticated users
   - Render the app for authenticated users

4. **Implement API Request Authentication**:
   - Add middleware to extract and verify JWT from cookies
   - Pass user ID to API handlers
   - Implement proper error handling

5. **Build the Login/Register UI**:
   - Create form components that use the auth context
   - Handle form submission and errors
   - Show loading states during API requests

By following this pattern, you'll have a secure, cookie-based JWT authentication system that works well for both server-rendered and client-side applications. 