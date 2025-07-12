# SPA Routing Guidelines

This document outlines the process for adding new routes to our Single Page Application (SPA) routing system.

## Overview

Our application uses a custom SPA routing system built on top of Next.js. The routing system is implemented in the `src/client/router` directory and consists of:

1. A `RouterProvider` component that manages navigation and renders the current route
2. Route components organized in folders within the `src/client/routes` directory
3. Route configuration in the `src/client/routes/index.ts` file
4. Navigation components in the `src/client/components/layout` directory

## Adding a New Route

Follow these steps to add a new route to the application:

### 1. Create a Route Component Folder

Create a new folder in the `src/client/routes` directory with the name of your route component. The structure depends on whether your route needs data fetching:

#### For Routes WITHOUT Data Fetching

```
src/client/routes/
├── NewRoute/
│   ├── NewRoute.tsx
│   └── index.ts
```

#### For Routes WITH Data Fetching

```
src/client/routes/
├── NewRoute/
│   ├── NewRoute.tsx      # Main component with DataFetcherWrapper
│   ├── NewRouteBase.tsx  # Base component that receives data as props
│   └── index.ts          # Exports the main wrapped component
```

### Component Organization Guidelines

Follow these best practices for route components:

- **Keep route components focused and small**: The main route component should be primarily responsible for layout and composition, not complex logic.
  
- **Split large components**: If a route component is getting too large (over 200-300 lines), split it into multiple smaller components within the same route folder.
  
- **Route-specific components**: Components that are only used by a specific route should be placed in that route's folder.
  
- **Shared components**: If a component is used by multiple routes, move it to `src/client/components` directory.
  
- **Component hierarchy**:
  ```
  src/client/routes/NewRoute/           # Route-specific folder
  ├── NewRoute.tsx                      # Main route component (exported)
  ├── NewRouteBase.tsx                  # Base component (for data fetching routes)
  ├── NewRouteHeader.tsx                # Route-specific component
  ├── NewRouteContent.tsx               # Route-specific component
  ├── NewRouteFooter.tsx                # Route-specific component
  └── index.ts                          # Exports the main component
  
  src/client/components/                # Shared components
  ├── SharedComponent.tsx               # Used by multiple routes
  └── ...
  ```

- Extract business logic into separate hooks or utility functions
- Follow the naming convention of PascalCase for component files and folders
- Use named exports (avoid default exports as per our guidelines)
- Keep related components and utilities in the same folder

## Data Fetching Pattern

### For Routes That Need Data Fetching

Use the `DataFetcherWrapper` pattern to separate data fetching logic from component rendering:

#### 1. Create the Main Component (NewRoute.tsx)

```tsx
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { DataFetcherWrapper } from '@/client/utils/DataFetcherWrapper';
import { getNewRouteData } from '@/apis/newroute/client';
import { NewRouteBase } from './NewRouteBase';

// Custom loader (optional)
const NewRouteLoader = () => (
    <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8
    }}>
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading your data...
        </Typography>
    </Box>
);

// Create the wrapped component using DataFetcherWrapper
export const NewRoute = DataFetcherWrapper(
    { 
        data: getNewRouteData,
        // For multiple data sources:
        // userData: getUserData,
        // settings: getSettings,
        // For query parameter-based fetching:
        // item: (queryParams) => getItem({ itemId: queryParams.itemId })
    },
    NewRouteBase,
    {
        loader: NewRouteLoader,
        showGlobalError: true,
        enableRefresh: true
    }
);
```

#### 2. Create the Base Component (NewRouteBase.tsx)

```tsx
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { GetNewRouteDataResponse } from '@/apis/newroute/types';

interface NewRouteBaseProps {
    data: GetNewRouteDataResponse;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

export const NewRouteBase: React.FC<NewRouteBaseProps> = ({
    data,
    isLoading,
    error,
    refresh
}) => {
    // Component only handles rendering - no data fetching logic
    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="error">{error}</Typography>
                <Button onClick={refresh}>Retry</Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4">New Route</Typography>
            {/* Render your data */}
            <Button onClick={refresh}>Refresh</Button>
        </Box>
    );
};
```

#### 3. Create the Index File (index.ts)

```tsx
export { NewRoute } from './NewRoute';
```

### For Routes WITHOUT Data Fetching

For simple routes that don't need data fetching, create a single component:

```tsx
// src/client/routes/NewRoute/NewRoute.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';

export const NewRoute: React.FC = () => {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4">New Route</Typography>
            {/* Your component content */}
        </Box>
    );
};
```

### DataFetcherWrapper Options

Configure the wrapper based on your needs:

```tsx
// Basic usage
export const NewRoute = DataFetcherWrapper(
    { data: getData },
    NewRouteBase
);

// With custom options
export const NewRoute = DataFetcherWrapper(
    { data: getData },
    NewRouteBase,
    {
        loader: CustomLoader,          // Custom loading component
        showGlobalLoading: false,      // Disable default loading (default: false)
        showGlobalError: true,         // Show error alerts (default: true)
        enableRefresh: true            // Show retry button (default: true)
    }
);

// Multiple data sources
export const NewRoute = DataFetcherWrapper(
    {
        userData: getUserData,
        settings: getSettings,
        preferences: getPreferences
    },
    NewRouteBase
);

// Query parameter-based fetching
export const NewRoute = DataFetcherWrapper(
    {
        item: (queryParams) => getItem({ itemId: queryParams.itemId }),
        relatedItems: (queryParams) => getRelatedItems({ itemId: queryParams.itemId })
    },
    NewRouteBase
);
```

### 2. Register the Route in the Routes Configuration

Add your new route to the routes configuration in `src/client/routes/index.ts`:

```tsx
// Import your new route component
import { NewRoute } from './NewRoute';

// Add it to the routes configuration
export const routes = createRoutes({
  '/': Home,
  '/ai-chat': AIChat,
  '/settings': Settings,
  '/file-manager': FileManager,
  '/new-route': NewRoute, // Add your new route here
  '/not-found': NotFound,
});
```

Route path naming conventions:
- Use kebab-case for route paths (e.g., `/new-route`, not `/newRoute`)
- Keep paths descriptive but concise
- Avoid deep nesting when possible

### 3. Add Navigation Item

Update the navigation items in `src/client/components/NavLinks.tsx` to include your new route:

```tsx
import NewRouteIcon from '@mui/icons-material/Extension'; // Choose an appropriate icon

export const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: <HomeIcon /> },
  { path: '/ai-chat', label: 'AI Chat', icon: <ChatIcon /> },
  { path: '/file-manager', label: 'Files', icon: <FolderIcon /> },
  { path: '/new-route', label: 'New Route', icon: <NewRouteIcon /> }, // Add your new route here
  { path: '/settings', label: 'Settings', icon: <SettingsIcon /> },
];
```

Navigation item guidelines:
- Choose a descriptive but concise label
- Select an appropriate Material UI icon that represents the route's purpose
- Consider the order of items in the navigation (most important/frequently used routes should be more accessible)

## Using the Router

### Navigation

To navigate between routes in your components, use the `useRouter` hook:

```tsx
import { useRouter } from '../../router';

const MyComponent = () => {
  const { navigate } = useRouter();
  
  const handleClick = () => {
    navigate('/new-route');
  };
  
  // You can also replace the current history entry
  const handleReplace = () => {
    navigate('/new-route', { replace: true });
  };
  
  return (
    <Button onClick={handleClick}>Go to New Route</Button>
  );
};
```

### Navigation Guidelines

- **Always use the navigation API from useRouter**: Never use `window.location.href` for navigation as it causes a full page reload and breaks the SPA behavior.

```tsx
// ❌ Don't do this
window.location.href = '/some-route';

// ✅ Do this instead
const { navigate } = useRouter();
navigate('/some-route');
```

- This ensures consistent navigation behavior throughout the application
- Preserves the SPA (Single Page Application) experience
- Maintains application state during navigation
- Enables proper history management

### Navigating with Parameters

When navigating to routes that require parameters (like IDs), construct the path with the parameters included:

```tsx
// Navigating to a route with a parameter
const { navigate } = useRouter();

// Navigate to a video page with a specific video ID
const handleVideoClick = (videoId) => {
  navigate(`/video/${videoId}`);
};
```

### Getting Current Route

You can access the current route path using the `useRouter` hook:

```tsx
import { useRouter } from '../../router';

const MyComponent = () => {
  const { currentPath } = useRouter();
  
  return (
    <div>
      <p>Current path: {currentPath}</p>
    </div>
  );
};
```

## Advanced Routing Features

### Route Parameters

Our router automatically parses route parameters from the URL path. To define a route with parameters, use the colon syntax in your route path:

```tsx
// In src/client/routes/index.ts
export const routes = createRoutes({
  // Other routes...
  '/items/:id': ItemDetail,
});
```

Then access the parameters in your component using the `useRouter` hook:

```tsx
// src/client/routes/ItemDetail/ItemDetail.tsx
import { useRouter } from '../../router';

export const ItemDetail = () => {
  const { routeParams } = useRouter();
  const itemId = routeParams.id;
  
  return (
    <div>
      <h1>Item Detail</h1>
      {itemId ? <p>Item ID: {itemId}</p> : <p>Invalid item ID</p>}
    </div>
  );
};
```

### Query Parameters

The router also automatically parses query parameters from the URL. Access them in your component using the `useRouter` hook:

```tsx
// src/client/routes/SearchResults/SearchResults.tsx
import { useRouter } from '../../router';

export const SearchResults = () => {
  const { queryParams } = useRouter();
  const searchQuery = queryParams.q || '';
  
  return (
    <div>
      <h1>Search Results</h1>
      <p>Query: {searchQuery}</p>
    </div>
  );
};
```

### Using DataFetcherWrapper with Query Parameters

For routes that need to fetch data based on URL parameters, use the query parameter support in DataFetcherWrapper:

```tsx
// src/client/routes/ItemDetail/ItemDetail.tsx
import { DataFetcherWrapper } from '@/client/utils/DataFetcherWrapper';
import { getItem, getItemComments } from '@/apis/items/client';
import { ItemDetailBase } from './ItemDetailBase';

export const ItemDetail = DataFetcherWrapper(
    {
        // These functions will receive the current query parameters
        item: (queryParams) => getItem({ itemId: queryParams.itemId }),
        comments: (queryParams) => getItemComments({ itemId: queryParams.itemId })
    },
    ItemDetailBase
);
```

## Best Practices for Route Components

### 1. Separation of Concerns

```tsx
// ✅ Good: Base component only handles rendering
const NewRouteBase = ({ data, error, refresh }) => {
    if (error) return <ErrorDisplay error={error} onRetry={refresh} />;
    return <div>{/* render data */}</div>;
};

// ✅ Good: Main component handles data fetching
export const NewRoute = DataFetcherWrapper(
    { data: getData },
    NewRouteBase
);

// ❌ Bad: Component handles both data fetching and rendering
const NewRoute = () => {
    const [data, setData] = useState(null);
    useEffect(() => { /* fetch data */ }, []);
    return <div>{/* render data */}</div>;
};
```

### 2. Error Handling

```tsx
// ✅ Good: Handle errors gracefully
const NewRouteBase = ({ data, error, refresh }) => {
    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error}</Alert>
                <Button onClick={refresh}>Try Again</Button>
            </Box>
        );
    }
    // ... rest of component
};
```

### 3. Loading States

```tsx
// ✅ Good: Provide meaningful loading states
const NewRouteLoader = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
            Loading your content...
        </Typography>
    </Box>
);
```

### 4. Type Safety

```tsx
// ✅ Good: Define proper interfaces for props
interface NewRouteBaseProps {
    data: GetDataResponse;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

const NewRouteBase: React.FC<NewRouteBaseProps> = ({ data, error, refresh }) => {
    // Component implementation with full type safety
};
```

## Summary

- **Routes WITHOUT data fetching**: Single component file
- **Routes WITH data fetching**: Use DataFetcherWrapper pattern with separate base component
- **Always use the wrapper pattern for data fetching**: This ensures consistent error handling and loading states
- **Keep base components pure**: They should only handle rendering, not data fetching
- **Use proper TypeScript interfaces**: Ensure type safety throughout your components
- **Handle errors gracefully**: Provide meaningful error messages and retry functionality
