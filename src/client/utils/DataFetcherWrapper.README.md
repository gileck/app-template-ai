# DataFetcherWrapper

A powerful Higher-Order Component (HOC) that abstracts data fetching logic from React components, providing a clean separation of concerns and consistent error handling.

## Overview

The `DataFetcherWrapper` eliminates the need for `useEffect` hooks in components by handling all data fetching logic at the wrapper level. It supports multiple data sources, query parameters, loading states, error handling, and refresh functionality.

## Key Features

- **All-or-Nothing Loading**: Components only render when ALL data has been successfully fetched
- **Query Parameters Support**: Automatically passes URL query parameters to fetcher functions
- **Multiple Data Sources**: Fetch from multiple APIs simultaneously
- **Type Safety**: Full TypeScript support with automatic type inference
- **Custom Loading States**: Support for custom loader components
- **Error Handling**: Built-in error handling with retry functionality
- **Automatic Refresh**: Re-fetch data when query parameters change

## Basic Usage

### Simple Data Fetching

```tsx
import { DataFetcherWrapper } from '@/client/utils/DataFetcherWrapper';
import { getTodos } from '@/apis/todos/client';

// Your component receives the fetched data as props
const TodosList = ({ todos, isLoading, error, refresh }) => {
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h1>Todos</h1>
      {todos.todos?.map(todo => (
        <div key={todo._id}>{todo.title}</div>
      ))}
      <button onClick={refresh}>Refresh</button>
    </div>
  );
};

// Wrap your component with the data fetcher
const WrappedTodosList = DataFetcherWrapper(
  { todos: getTodos },  // Object of fetcher functions
  TodosList             // Your component
);

export default WrappedTodosList;
```

### Multiple Data Sources

```tsx
import { DataFetcherWrapper } from '@/client/utils/DataFetcherWrapper';
import { getTodos } from '@/apis/todos/client';
import { getUserProfile } from '@/apis/user/client';

const Dashboard = ({ todos, profile, isLoading, error, refresh }) => {
  return (
    <div>
      <h1>Welcome {profile.user?.name}</h1>
      <div>You have {todos.todos?.length} todos</div>
    </div>
  );
};

const WrappedDashboard = DataFetcherWrapper(
  {
    todos: getTodos,
    profile: getUserProfile
  },
  Dashboard
);
```

## Query Parameters Support

The wrapper automatically detects fetcher functions that accept parameters and passes the current URL query parameters to them.

### URL-Based Data Fetching

```tsx
import { DataFetcherWrapper } from '@/client/utils/DataFetcherWrapper';
import { getTodo } from '@/apis/todos/client';

// Your fetcher function receives query parameters
const fetchTodo = (queryParams) => getTodo({ todoId: queryParams.todoId });

const SingleTodo = ({ todo, isLoading, error, refresh }) => {
  if (!todo.todo) return <div>Todo not found</div>;
  
  return (
    <div>
      <h1>{todo.todo.title}</h1>
      <p>Status: {todo.todo.completed ? 'Done' : 'Pending'}</p>
    </div>
  );
};

// Wrapper automatically passes query params to fetchTodo
const WrappedSingleTodo = DataFetcherWrapper(
  { todo: fetchTodo },
  SingleTodo
);

// Usage: Navigate to /todos/123?todoId=123
// The todoId will be automatically passed to fetchTodo
```

### Mixed Fetchers (With and Without Parameters)

```tsx
const WrappedComponent = DataFetcherWrapper(
  {
    todos: getTodos,                                    // No parameters
    todo: (params) => getTodo({ todoId: params.id }),   // Uses query params
    user: getCurrentUser                                // No parameters
  },
  MyComponent
);
```

## Configuration Options

### Custom Loader

```tsx
const CustomLoader = () => (
  <div style={{ textAlign: 'center', padding: '2rem' }}>
    <div>Loading your todos...</div>
    <div className="spinner" />
  </div>
);

const WrappedTodos = DataFetcherWrapper(
  { todos: getTodos },
  TodosList,
  { 
    loader: CustomLoader,
    showGlobalLoading: false  // Disable default loading
  }
);
```

### No Loader (Silent Loading)

```tsx
const WrappedTodos = DataFetcherWrapper(
  { todos: getTodos },
  TodosList,
  { 
    loader: null,            // No custom loader
    showGlobalLoading: false // No default loader
  }
);
// Component renders nothing until data is ready
```

### Configuration Options

```tsx
interface DataFetcherWrapperOptions {
  showGlobalLoading?: boolean;  // Show default loading spinner (default: false)
  showGlobalError?: boolean;    // Show error alerts (default: true)
  enableRefresh?: boolean;      // Show retry button on errors (default: true)
  loader?: ComponentType | null; // Custom loader component (default: null)
}
```

## Critical Behavior: All-or-Nothing Loading

**Important**: The wrapped component only renders when ALL fetchers have resolved successfully.

```tsx
const WrappedComponent = DataFetcherWrapper(
  {
    todos: getTodos,
    user: getUser,
    settings: getSettings
  },
  MyComponent
);

// MyComponent will ONLY render when:
// ✅ todos, user, AND settings have all loaded successfully
// ❌ It will NOT render with partial data (e.g., only todos loaded)
// ❌ Any single error clears all data and shows error state
```

## Type Safety

The wrapper provides full TypeScript support with automatic type inference:

```tsx
// TypeScript automatically infers the prop types
const MyComponent = ({ 
  todos,    // Automatically typed as GetTodosResponse
  user,     // Automatically typed as GetUserResponse  
  isLoading,// boolean
  error,    // string | null
  refresh   // () => void
}) => {
  // Your component code with full type safety
};

const WrappedComponent = DataFetcherWrapper(
  {
    todos: getTodos,  // Returns Promise<CacheResult<GetTodosResponse>>
    user: getUser     // Returns Promise<CacheResult<GetUserResponse>>
  },
  MyComponent
);
```

## Error Handling

### Built-in Error Handling

```tsx
const WrappedComponent = DataFetcherWrapper(
  { todos: getTodos },
  TodosList,
  {
    showGlobalError: true,  // Shows error alert (default)
    enableRefresh: true     // Shows retry button (default)
  }
);
```

### Custom Error Handling in Component

```tsx
const TodosList = ({ todos, error, refresh }) => {
  if (error) {
    return (
      <div className="custom-error">
        <h2>Oops! Something went wrong</h2>
        <p>{error}</p>
        <button onClick={refresh}>Try Again</button>
      </div>
    );
  }
  
  // Render normal content
  return <div>{/* ... */}</div>;
};

const WrappedComponent = DataFetcherWrapper(
  { todos: getTodos },
  TodosList,
  { showGlobalError: false } // Disable built-in error handling
);
```

## Best Practices

### 1. Keep Components Pure
```tsx
// ✅ Good: Component only handles rendering
const TodosList = ({ todos }) => (
  <div>{todos.todos?.map(todo => <div key={todo._id}>{todo.title}</div>)}</div>
);

// ❌ Bad: Component handles data fetching
const TodosList = () => {
  const [todos, setTodos] = useState([]);
  useEffect(() => { /* fetching logic */ }, []);
  return <div>{/* ... */}</div>;
};
```

### 2. Use Descriptive Fetcher Names
```tsx
// ✅ Good: Clear prop names
const WrappedComponent = DataFetcherWrapper(
  {
    userTodos: getTodos,
    userProfile: getUserProfile,
    appSettings: getSettings
  },
  MyComponent
);

// ❌ Bad: Unclear prop names
const WrappedComponent = DataFetcherWrapper(
  {
    data1: getTodos,
    data2: getUserProfile,
    config: getSettings
  },
  MyComponent
);
```

### 3. Handle Loading States Appropriately
```tsx
// For critical data - use custom loader
const WrappedComponent = DataFetcherWrapper(
  { todos: getTodos },
  TodosList,
  { loader: MyCustomLoader }
);

// For background data - silent loading
const WrappedComponent = DataFetcherWrapper(
  { stats: getStats },
  StatsWidget,
  { loader: null, showGlobalLoading: false }
);
```

### 4. Leverage Query Parameters
```tsx
// ✅ Good: Use query params for dynamic data
const fetchUserTodos = (params) => getTodos({ userId: params.userId });

// URL: /dashboard?userId=123
const WrappedDashboard = DataFetcherWrapper(
  { userTodos: fetchUserTodos },
  Dashboard
);

// ✅ Also good: Mix static and dynamic fetchers
const WrappedDashboard = DataFetcherWrapper(
  {
    appConfig: getAppConfig,                           // Static
    userTodos: (params) => getTodos({ userId: params.userId }) // Dynamic
  },
  Dashboard
);
```

## Migration from useEffect

### Before (using useEffect)
```tsx
const TodosList = () => {
  const [todos, setTodos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        setLoading(true);
        const result = await getTodos();
        if (result.data?.error) {
          setError(result.data.error);
        } else {
          setTodos(result.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTodos();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>{/* render todos */}</div>;
};
```

### After (using DataFetcherWrapper)
```tsx
const TodosList = ({ todos, isLoading, error }) => {
  // Component only handles rendering - much cleaner!
  return <div>{/* render todos */}</div>;
};

const WrappedTodosList = DataFetcherWrapper(
  { todos: getTodos },
  TodosList
);
```

## Advanced Examples

### Complex Dashboard with Multiple Data Sources
```tsx
import { DataFetcherWrapper } from '@/client/utils/DataFetcherWrapper';

const Dashboard = ({ 
  userProfile, 
  todoStats, 
  recentActivity, 
  systemNotifications,
  refresh 
}) => (
  <div>
    <header>Welcome back, {userProfile.user?.name}!</header>
    <div className="stats">
      <div>Total Todos: {todoStats.stats?.total}</div>
      <div>Completed: {todoStats.stats?.completed}</div>
    </div>
    <div className="recent">
      {recentActivity.activities?.map(activity => (
        <div key={activity.id}>{activity.description}</div>
      ))}
    </div>
    <div className="notifications">
      {systemNotifications.notifications?.map(notif => (
        <div key={notif.id}>{notif.message}</div>
      ))}
    </div>
    <button onClick={refresh}>Refresh Dashboard</button>
  </div>
);

const WrappedDashboard = DataFetcherWrapper(
  {
    userProfile: getUserProfile,
    todoStats: getTodoStats,
    recentActivity: getRecentActivity,
    systemNotifications: getSystemNotifications
  },
  Dashboard,
  {
    loader: () => <div>Loading your dashboard...</div>,
    showGlobalError: true,
    enableRefresh: true
  }
);
```

### Dynamic Content Based on Route Parameters
```tsx
import { DataFetcherWrapper } from '@/client/utils/DataFetcherWrapper';

const ProjectDetail = ({ project, tasks, teamMembers }) => (
  <div>
    <h1>{project.project?.name}</h1>
    <div>Tasks: {tasks.tasks?.length}</div>
    <div>Team: {teamMembers.members?.length} members</div>
  </div>
);

const WrappedProjectDetail = DataFetcherWrapper(
  {
    project: (params) => getProject({ projectId: params.projectId }),
    tasks: (params) => getProjectTasks({ projectId: params.projectId }),
    teamMembers: (params) => getProjectTeam({ projectId: params.projectId })
  },
  ProjectDetail
);

// Usage: Navigate to /projects/abc123?projectId=abc123
```

This wrapper provides a robust, type-safe solution for data fetching in React applications while maintaining clean component separation and consistent error handling. 