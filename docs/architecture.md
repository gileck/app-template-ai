# Application Architecture

This document provides a high-level overview of the application architecture, designed for a Progressive Web App (PWA) with offline-first capabilities and native-like performance.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [App Boot Flow](#app-boot-flow)
3. [Authentication](#authentication)
4. [State Management](#state-management)
5. [Client-Server Communication](#client-server-communication)
6. [Offline Architecture](#offline-architecture)
7. [User Settings](#user-settings)
8. [Route & Component Organization](#route--component-organization)
9. [Key Files Reference](#key-files-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              React Application                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   Features      │  │   Routes        │  │   Components    │             │
│  │  (auth, etc.)   │  │  (pages)        │  │  (shared UI)    │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           ▼                    ▼                    ▼                       │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │                     State Layer                              │           │
│  │  ┌─────────────────┐          ┌─────────────────┐           │           │
│  │  │  Zustand Stores │          │  React Query    │           │           │
│  │  │  (Client State) │          │  (Server State) │           │           │
│  │  └────────┬────────┘          └────────┬────────┘           │           │
│  │           │                            │                     │           │
│  │           ▼                            ▼                     │           │
│  │  ┌─────────────────┐          ┌─────────────────┐           │           │
│  │  │  localStorage   │          │    IndexedDB    │           │           │
│  │  │  (instant boot) │          │  (data cache)   │           │           │
│  │  └─────────────────┘          └─────────────────┘           │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                              API Layer                                       │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  apiClient.call (GET)  │  apiClient.post (mutations)        │           │
│  │  - Cache-first         │  - Offline queue                   │           │
│  │  - SWR support         │  - Batch sync                      │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                    │                                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Next.js Server                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  API Routes     │  │  Auth (JWT)     │  │  Database       │             │
│  │  /api/process/* │  │  HttpOnly Cookie│  │  MongoDB        │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Offline-First**: App works without network, syncs when online
2. **Instant Boot**: App renders immediately using cached state
3. **Optimistic Updates**: UI updates before server confirms
4. **Feature-Based Organization**: Code is organized by feature, not type

---

## App Boot Flow

When a user opens the app, the following sequence occurs:

```
User Opens App
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. React Query Cache Restore (~50-100ms)                       │
│     - IndexedDB → Memory                                        │
│     - Server data available immediately                         │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Zustand Hydration (instant, sync)                           │
│     - localStorage → Zustand stores                             │
│     - isProbablyLoggedIn, userHint, settings, lastRoute         │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. AuthWrapper Renders                                         │
│     - If isProbablyLoggedIn: Show app shell immediately         │
│     - If not: Show login dialog                                 │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Route Restoration                                           │
│     - If lastRoute exists: Navigate to saved route              │
│     - Background: Auth validation + data revalidation           │
└─────────────────────────────────────────────────────────────────┘
```

This enables **instant startup** - the app appears immediately with cached data while fresh data loads in the background.

---

## Authentication

The app uses a **hint-based instant boot** pattern for authentication.

### Key Concepts

| Concept | Storage | Purpose |
|---------|---------|---------|
| `isProbablyLoggedIn` | localStorage (Zustand) | UI hint for instant boot |
| `userPublicHint` | localStorage (Zustand) | Name/avatar for immediate display |
| JWT Token | HttpOnly Cookie | Actual authentication (server-side) |
| Validated User | Memory (Zustand) | Full user data after server validation |

### Flow

1. **On Login**: Server sets HttpOnly JWT cookie + client stores hint in Zustand
2. **On App Open**: Zustand hydrates hint → show app immediately
3. **Background**: Validate token with server → update or clear state
4. **On 401**: Clear hints, show login dialog

📚 **Detailed Documentation**: [authentication.md](./authentication.md)

---

## State Management

The app uses two complementary state management solutions:

### Zustand (Client State)

For state that belongs to the client and should persist across sessions:

```typescript
import { useAuthStore } from '@/client/features/auth';
import { useSettingsStore } from '@/client/features/settings';

// Reading state
const user = useUser();
const theme = useSettingsStore((s) => s.settings.theme);

// Updating state
const updateSettings = useSettingsStore((s) => s.updateSettings);
updateSettings({ theme: 'dark' });
```

**Use Zustand for:**
- Auth hints (instant boot)
- User preferences (theme, offline mode)
- Route persistence (last visited page)
- Any UI state that should survive app restart

### React Query (Server State)

For data that comes from the server:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// Reading server data
const { data, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
});

// Mutating server data
const mutation = useMutation({
    mutationFn: createTodo,
    onSuccess: () => queryClient.invalidateQueries(['todos']),
});
```

**Use React Query for:**
- Any data fetched from APIs
- Data that needs caching/revalidation
- Server state with loading/error states

### When to Use What

```
Does this state come from an API?
  YES → React Query
  NO ↓

Should it persist across app restarts?
  YES → Zustand store
  NO ↓

Is it temporary UI state (modal, form)?
  YES → useState
```

📚 **Detailed Documentation**: See `.cursor/rules/state-management-guidelines.mdc`

---

## Client-Server Communication

All API calls go through a centralized `apiClient`:

### GET Requests (Queries)

```typescript
// Uses cache-first strategy
const response = await apiClient.call<ResponseType>('entity/list', params);
// Returns: { data, isFromCache, metadata }
```

- Cached in IndexedDB via React Query
- Supports stale-while-revalidate
- Returns cached data when offline

### POST Requests (Mutations)

```typescript
// Bypasses cache, queues when offline
const response = await apiClient.post<ResponseType>('entity/create', params);
// Returns: { data: {} } when offline (queued for later)
```

- Never cached
- Queued in localStorage when offline
- Batch-synced when online via `/api/process/batch-updates`

### API Structure

```
src/apis/{feature}/
├── index.ts      # API name constants
├── types.ts      # Request/Response types
├── client.ts     # Client-side functions (apiClient.call/post)
├── server.ts     # Server handler registration
└── handlers/     # Server-side implementation
```

📚 **Detailed Documentation**: [api-endpoint-format.md](./api-endpoint-format.md)

---

## Offline Architecture

The app is designed to work fully offline:

### Offline Detection

```typescript
import { useEffectiveOffline } from '@/client/features/settings';

const isOffline = useEffectiveOffline();
// true if: user enabled offline mode OR device has no network
```

### Data Flow When Offline

```
┌─────────────────────────────────────────────────────────────────┐
│  GET Request (offline)                                          │
│  1. Check IndexedDB cache                                       │
│  2. If cached → return cached data                              │
│  3. If not cached → return error: "Not available offline"       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  POST Request (offline)                                         │
│  1. Add to offline queue (localStorage)                         │
│  2. Return {} immediately (no error)                            │
│  3. Optimistic update handles UI                                │
│  4. When online → batch sync all queued requests                │
└─────────────────────────────────────────────────────────────────┘
```

### Optimistic Updates

Mutations update the UI immediately, then sync with server:

```typescript
useMutation({
    mutationFn: updateTodo,
    
    // Update UI immediately
    onMutate: async (newData) => {
        const previous = queryClient.getQueryData(['todos']);
        queryClient.setQueryData(['todos'], optimisticUpdate(newData));
        return { previous };
    },
    
    // Rollback on error
    onError: (err, vars, context) => {
        queryClient.setQueryData(['todos'], context.previous);
    },
    
    // Handle offline (data may be {})
    onSuccess: (data) => {
        if (data && data.id) {
            queryClient.setQueryData(['todos', data.id], data);
        }
    },
});
```

📚 **Detailed Documentation**: [offline-pwa-support.md](./offline-pwa-support.md)

---

## User Settings

Settings are managed via Zustand with localStorage persistence:

```typescript
import { useSettingsStore, useEffectiveOffline } from '@/client/features/settings';

// Read settings
const theme = useSettingsStore((s) => s.settings.theme);
const offlineMode = useSettingsStore((s) => s.settings.offlineMode);

// Update settings
const updateSettings = useSettingsStore((s) => s.updateSettings);
updateSettings({ theme: 'dark' });

// Check effective offline (user setting OR device offline)
const isOffline = useEffectiveOffline();
```

### Available Settings

| Setting | Type | Description |
|---------|------|-------------|
| `theme` | `'light' \| 'dark'` | UI theme |
| `offlineMode` | `boolean` | Force offline mode |
| `staleWhileRevalidate` | `boolean` | Cache strategy |
| `aiModel` | `string` | Selected AI model |

📚 **Detailed Documentation**: See `.cursor/rules/settings-usage-guidelines.mdc`

---

## Route & Component Organization

### Feature-Based Structure

Code is organized by **feature**, not by type:

```
src/client/
├── features/                    # Cross-cutting features
│   ├── auth/                    # Authentication
│   │   ├── store.ts             # Zustand store
│   │   ├── hooks.ts             # React Query hooks
│   │   ├── types.ts             # TypeScript types
│   │   ├── AuthWrapper.tsx      # Component
│   │   └── index.ts             # Public exports
│   ├── settings/                # User settings
│   └── router/                  # Route persistence
│
├── routes/                      # Page components
│   ├── Todos/                   # Todo list page
│   │   ├── Todos.tsx            # Main component
│   │   ├── hooks.ts             # Route-specific hooks
│   │   └── index.ts
│   ├── SingleTodo/              # Single todo page
│   └── Settings/                # Settings page
│
├── components/                  # Shared UI only
│   ├── ui/                      # shadcn primitives
│   └── layout/                  # App shell
│
├── config/                      # Centralized configuration
│   └── defaults.ts              # TTL, cache times
│
└── query/                       # React Query setup
    └── defaults.ts              # Query defaults
```

### How a Route Component Accesses State

```typescript
// src/client/routes/MyFeature/MyFeature.tsx

// 1. Import from features (cross-cutting state)
import { useUser } from '@/client/features/auth';
import { useSettingsStore } from '@/client/features/settings';

// 2. Import route-specific hooks (colocated)
import { useMyData, useCreateMyData } from './hooks';

// 3. Import shared UI components
import { Button } from '@/client/components/ui/button';

export function MyFeature() {
    // Cross-cutting state from features
    const user = useUser();
    const theme = useSettingsStore((s) => s.settings.theme);
    
    // Route-specific server data
    const { data, isLoading } = useMyData();
    const createMutation = useCreateMyData();
    
    // Local UI state (ephemeral)
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    return (/* ... */);
}
```

### Import Rules

| What | Import From |
|------|-------------|
| Cross-cutting stores/hooks | `@/client/features/{name}` |
| Route-specific hooks | `./hooks` (colocated) |
| Shared UI components | `@/client/components/ui/*` |
| API types | `@/apis/{name}/types` |
| Config constants | `@/client/config` |

📚 **Detailed Documentation**: See `.cursor/rules/feature-based-structure.mdc`

---

## Key Files Reference

### Configuration

| File | Purpose |
|------|---------|
| `src/client/config/defaults.ts` | Centralized TTL and cache constants |
| `src/client/query/defaults.ts` | React Query default options |

### Features

| File | Purpose |
|------|---------|
| `src/client/features/auth/store.ts` | Auth state + instant boot hints |
| `src/client/features/auth/hooks.ts` | Login, logout, validation hooks |
| `src/client/features/settings/store.ts` | User preferences |
| `src/client/features/router/store.ts` | Route persistence |

### Infrastructure

| File | Purpose |
|------|---------|
| `src/client/utils/apiClient.ts` | API client with offline support |
| `src/client/utils/offlinePostQueue.ts` | Offline mutation queue |
| `src/client/query/QueryProvider.tsx` | React Query + IndexedDB persistence |

### Documentation

| File | Topic |
|------|-------|
| `docs/authentication.md` | Auth flow details |
| `docs/offline-pwa-support.md` | Offline architecture details |
| `docs/api-endpoint-format.md` | API structure |
| `.cursor/rules/state-management-guidelines.mdc` | State management patterns |
| `.cursor/rules/feature-based-structure.mdc` | Code organization |

---

## Summary

This architecture enables:

✅ **Instant startup** - App renders immediately from cache  
✅ **Offline-first** - Full functionality without network  
✅ **Native-like UX** - Optimistic updates, no loading spinners  
✅ **Maintainable code** - Feature-based organization  
✅ **Type safety** - End-to-end TypeScript  

