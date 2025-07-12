import { useState, useEffect, useMemo } from 'react';
import { createContext, useContext } from 'react';

// Define router context and types
type RouteParams = Record<string, string>;
type QueryParams = Record<string, string>;

type RouterContextType = {
  currentPath: string;
  routeParams: RouteParams;
  queryParams: QueryParams;
  navigate: (path: string, options?: { replace?: boolean }) => void;
};

const RouterContext = createContext<RouterContextType>({
  currentPath: '/',
  routeParams: {},
  queryParams: {},
  navigate: () => { },
});

// Custom hook to use router
export const useRouter = () => useContext(RouterContext);

// Helper function to parse route parameters
const parseRouteParams = (currentPath: string, routePattern: string): RouteParams => {
  // Convert route pattern to regex
  // e.g., '/items/:id' becomes /^\/items\/([^\/]+)$/
  const paramNames: string[] = [];
  const patternRegex = routePattern.replace(/:[^\/]+/g, (match) => {
    paramNames.push(match.substring(1)); // Store param name without the colon
    return '([^/]+)';
  });

  const regex = new RegExp(`^${patternRegex.replace(/\//g, '\\/')}$`);
  const match = currentPath.match(regex);

  if (!match) return {};

  // Create params object from matched groups
  const params: RouteParams = {};
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1]; // +1 because match[0] is the full match
  });

  return params;
};

// Helper function to parse query parameters
const parseQueryParams = (): QueryParams => {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const queryParams: QueryParams = {};

  params.forEach((value, key) => {
    queryParams[key] = value;
  });

  return queryParams;
};

// Router provider component
export const RouterProvider = ({ children, routes }: {
  children?: (Component: React.ComponentType) => React.ReactNode,
  routes: Record<string, React.ComponentType>
}) => {
  // Initialize with current path or default to '/'
  const [currentPath, setCurrentPath] = useState<string>(() => {
    // Use the pathname part of the URL without the leading slash
    return typeof window !== 'undefined'
      ? window.location.pathname === '/'
        ? '/'
        : window.location.pathname
      : '/';
  });

  // Parse query parameters
  const [queryParams, setQueryParams] = useState<QueryParams>(() => parseQueryParams());

  // Find matching route pattern and parse route parameters
  const { RouteComponent, routeParams } = useMemo(() => {
    const pathWithoutQuery = currentPath.split('?')[0];
    // First check for exact matches
    if (routes[pathWithoutQuery]) {
      return { RouteComponent: routes[pathWithoutQuery], routeParams: {} };
    }

    // Then check for parameterized routes
    for (const pattern in routes) {
      if (pattern.includes(':')) {
        const params = parseRouteParams(pathWithoutQuery, pattern);
        if (Object.keys(params).length > 0) {
          return { RouteComponent: routes[pattern], routeParams: params };
        }
      }
    }

    // Fallback to not-found or home
    return {
      RouteComponent: routes['/not-found'] || routes['/'],
      routeParams: {}
    };
  }, [currentPath, routes]);

  // Handle navigation
  const navigate = (path: string, options: { replace?: boolean } = {}) => {
    // Update browser history
    if (options.replace) {
      window.history.replaceState(null, '', path);
    } else {
      window.history.pushState(null, '', path);
    }

    // Update current path state
    setCurrentPath(path);

    // Update query params
    setQueryParams(parseQueryParams());
  };

  // Listen for popstate events (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setQueryParams(parseQueryParams());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Provide router context and render current route
  // console.log('currentPath', currentPath);

  // Provide router context and render current route
  return (
    <RouterContext.Provider value={{ currentPath, routeParams, queryParams, navigate }}>
      {children ? children(RouteComponent) : <RouteComponent />}
    </RouterContext.Provider>
  );
};

// Route mapping utility
export const createRoutes = (routeComponents: Record<string, React.ComponentType>) => {
  return routeComponents;
};
