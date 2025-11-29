# Offline PWA Support Documentation

## Overview

The application implements full offline Progressive Web App (PWA) support with IndexedDB-based caching, service worker integration, and user-friendly error handling. Users can work seamlessly offline with cached data and receive clear feedback when content isn't available.

## Architecture

### 1. Client-Side Cache Provider (IndexedDB)

**File**: `src/client/utils/indexedDBCache.ts`

The application uses IndexedDB as the primary client-side cache storage with automatic fallback to localStorage if IndexedDB is unavailable (e.g., private browsing mode).

#### Key Features:
- **Database**: `app_cache_db` (version 1)
- **Object Store**: `cache_entries` with keyPath `key`
- **Smart Provider**: Automatically detects and uses the best available storage option
- **TTL Support**: Time-to-live for cache entries with automatic expiration
- **Stale Data Handling**: Can return stale data when fresh data isn't available
- **LRU Updates**: Tracks last accessed time for cache management

#### Implementation Details:

```typescript
// Cache entry structure
interface CacheEntry {
    key: string;
    data: unknown;
    metadata: CacheMetadata;
}

// Smart provider with fallback
export const clientCacheProvider = createSmartProvider();
```

The smart provider:
1. Tests IndexedDB availability on first use
2. Falls back to localStorage if IndexedDB fails
3. Logs which provider is being used
4. Maintains consistent API regardless of underlying storage

### 2. API Client Offline Behavior

**File**: `src/client/utils/apiClient.ts`

The API client handles offline scenarios gracefully without throwing exceptions, instead returning typed error payloads that integrate with existing error handling.

#### Offline Detection:

```typescript
const effectiveOffline = (settings?.offlineMode === true) || 
                        (typeof navigator !== 'undefined' && !navigator.onLine);
```

Two sources determine offline state:
1. **Manual Offline Mode**: User-toggled setting (`settings.offlineMode`)
2. **Device Offline**: Browser's `navigator.onLine` status

#### GET Requests (`apiClient.call`)

When offline:

1. **If `disableCache: true`**:
   - Returns: `{ data: { error: 'Network unavailable while offline' }, isFromCache: false }`
   - User sees: Clear message that network is required

2. **If cache exists**:
   - Returns: Cached data with `isFromCache: true` and metadata
   - User sees: Cached content (may be stale)

3. **If no cache**:
   - Returns: `{ data: { error: "This content isn't available offline yet" }, isFromCache: true }`
   - User sees: Friendly message explaining content needs to be accessed online first

#### POST Requests (`apiClient.post`)

When offline:
- Request is enqueued in localStorage queue for batch sync later
- Returns: `{ data: {}, isFromCache: false }` (empty object, NOT an error)

⚠️ **CRITICAL: Mutation Callers Must Handle Empty Data**

When offline, `apiClient.post` returns an empty object `{}` instead of actual response data.
This is intentional - it allows optimistic updates to persist without triggering rollbacks.

**All mutation `onSuccess` callbacks MUST guard against empty/undefined data:**

```typescript
// ✅ CORRECT: Guard against empty data
onSuccess: (data) => {
    if (data && data.todo) {
        queryClient.setQueryData(['todos', data.todo._id], { todo: data.todo });
    }
    queryClient.invalidateQueries({ queryKey: ['todos'] });
},

// ❌ WRONG: Will crash when offline
onSuccess: (data) => {
    queryClient.setQueryData(['todos', data.todo._id], { todo: data.todo }); // data.todo is undefined!
},
```

**Why this design?**
1. Optimistic updates (in `onMutate`) already update the UI immediately
2. Returning `{}` prevents the mutation from "failing" (no rollback)
3. The request is queued and will sync via batch-updates when online
4. After sync, React Query caches are invalidated to fetch fresh data
- Queue automatically flushes when connection is restored
- User sees: Confirmation that action will complete when online

### 3. Offline Banner

**File**: `src/client/components/layout/TopNavBar.tsx`

A global banner appears below the top navigation when offline, providing constant visual feedback.

```tsx
{effectiveOffline && (
  <div className="sticky top-14 z-40 w-full bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs py-1 text-center border-b border-amber-500/30">
    ⚠️ Offline mode: using cached data
  </div>
)}
```

**Features**:
- Reactive to both manual offline mode and device connectivity
- Styled with amber colors for visibility in light/dark themes
- Sticky positioning keeps it visible while scrolling
- Automatically appears/disappears based on connectivity

### 4. Error Handling Pattern

**File**: `src/client/routes/AIChat/AIChat.tsx` (example)

Components check for error payloads before processing responses:

```typescript
const { data, isFromCache, metadata } = await sendChatMessage({...});

// Check if the response contains an error
if (data.error) {
  // Handle error payload - display error message
  const errorMessage: Message = {
    id: Date.now().toString(),
    text: data.error,
    sender: 'ai',
    timestamp: new Date(),
    isFromCache
  };
  setMessages(prev => [...prev, errorMessage]);
} else {
  // Safe to destructure - no error present
  const { cost, result } = data;
  // ... process success response
}
```

This pattern:
- Prevents runtime crashes from missing properties
- Displays user-friendly error messages inline
- Maintains consistent error handling across the app
- Works with React Query hooks for data fetching

### 5. Cache Management

**File**: `src/client/routes/Settings/Settings.tsx`

Users can clear both server-side and client-side caches from the Settings page.

```typescript
// Clear server-side cache
const result = await clearCache();

// Clear client-side cache (IndexedDB with localStorage fallback)
const clientCacheCleared = await clientCacheProvider.clearAllCache();
```

**Features**:
- Clears both server and client caches
- Provides detailed feedback on success/failure
- Handles partial failures gracefully
- Updates UI text to reflect IndexedDB usage

### 6. Service Worker Integration

**File**: `next.config.ts`

The application uses `next-pwa` for service worker management:

```typescript
const nextConfig: NextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // ... caching strategies for fonts, static assets, images, etc.
  ],
})
```

**Configuration**:
- Disabled in development for easier debugging
- Enabled in production for offline capabilities
- Precaches app shell and static assets
- Runtime caching for external resources (fonts, images)

**Note**: POST requests are not cached by the service worker; they rely on the client cache and offline POST queue.

## Type System

**File**: `src/common/cache/types.ts`

The cache metadata type includes support for all cache providers:

```typescript
export interface CacheMetadata {
  createdAt: string;
  lastAccessedAt: string;
  key: string;
  provider: 'fs' | 's3' | 'localStorage' | 'indexedDB';
}
```

This ensures type consistency across:
- Server-side caching (fs, s3)
- Client-side caching (localStorage, indexedDB)
- Cache metadata tracking

## User Experience Flow

### Online → Offline Transition

1. User is browsing with network connection
2. Network connection lost or user enables offline mode
3. Offline banner appears at top of screen
4. Subsequent requests:
   - Previously cached data loads normally
   - Uncached content shows friendly error message
   - POST requests are queued for later

### Offline → Online Transition

1. Network connection restored or user disables offline mode
2. Offline banner disappears
3. Queued POST requests automatically flush
4. Fresh data fetched for new requests
5. Cache updated with new responses

### First-Time Offline

1. User goes offline without having cached data
2. Attempts to access content
3. Sees: "This content isn't available offline yet"
4. Must go online to cache the content first

## Migration Notes

### No Migration Required

The implementation starts fresh with IndexedDB:
- Old localStorage cache remains but is unused
- Will naturally expire or be cleared by browser
- Users rebuild cache on first use after deployment
- Simpler than migrating existing cache data

### Backward Compatibility

- All API response types already include optional `error?: string`
- Existing error handling patterns work without modification
- React Query hooks check for error payloads
- No breaking changes to API contracts

## Testing Checklist

- [ ] Toggle device offline/online → banner appears/disappears
- [ ] Toggle `settings.offlineMode` → banner appears/disappears
- [ ] Offline + cached data → returns cached data
- [ ] Offline + no cache → returns friendly error message
- [ ] Offline + disableCache → returns "Network unavailable" error
- [ ] Offline POST → queues and returns friendly message
- [ ] Online → POST queue flushes automatically
- [ ] Clear cache → clears IndexedDB
- [ ] Private browsing → falls back to localStorage gracefully

## Performance Considerations

### IndexedDB Benefits

1. **Larger Storage**: ~50MB+ vs localStorage's ~5-10MB
2. **Async Operations**: Non-blocking I/O
3. **Structured Data**: Native support for objects
4. **Better Performance**: Optimized for large datasets

### Cache Strategy

- **Online**: Stale-while-revalidate when enabled
- **Offline**: Serve from cache only
- **TTL**: 1 hour default, configurable per request
- **Max Stale Age**: 7 days default, configurable per request

## Security Considerations

1. **User Scoping**: Cache keys should include user context to prevent cross-user data leakage
2. **Sensitive Data**: Consider excluding sensitive data from client-side cache
3. **Cache Clearing**: Users can manually clear cache from Settings
4. **Private Browsing**: Automatic fallback to localStorage (session-only)

## Future Enhancements

Potential improvements for future iterations:

1. **Cache Size Management**: Implement LRU eviction when storage limits approached
2. **Selective Caching**: Allow per-API configuration of cache behavior
3. **Background Sync**: Use Background Sync API for more reliable POST queue
4. **Cache Warming**: Pre-cache critical content on app load
5. **Offline Analytics**: Track offline usage patterns
6. **Conflict Resolution**: Handle conflicts when syncing offline changes

## Troubleshooting

### Cache Not Working

1. Check if IndexedDB is available in browser
2. Verify console logs for provider selection
3. Check browser's IndexedDB storage in DevTools
4. Try clearing cache and rebuilding

### Offline Mode Stuck

1. Check `settings.offlineMode` in localStorage
2. Verify `navigator.onLine` status
3. Check for network connectivity issues
4. Try toggling offline mode in Settings

### POST Queue Not Flushing

1. Verify online status (`navigator.onLine`)
2. Check localStorage for queued items
3. Verify `shouldFlushNow()` logic
4. Check browser console for errors

## Related Files

### State Management (Zustand)
- `src/client/stores/settingsStore.ts` - Settings state with offline mode
- `src/client/stores/authStore.ts` - Auth state with instant-boot hints
- `src/client/stores/uiStore.ts` - UI state (last route, filters)

### React Query Persistence
- `src/client/query/QueryProvider.tsx` - React Query with IndexedDB persistence
- `src/client/query/persister.ts` - IndexedDB persister for React Query
- `src/client/query/queryClient.ts` - Query client configuration

### Cache & Offline
- `src/client/utils/indexedDBCache.ts` - IndexedDB cache provider (for apiClient)
- `src/client/utils/apiClient.ts` - API client with offline handling
- `src/client/utils/offlinePostQueue.ts` - POST request queue

### UI Components
- `src/client/components/layout/TopNavBar.tsx` - Offline banner
- `src/client/routes/Settings/Settings.tsx` - Cache management UI

### Configuration
- `src/common/cache/types.ts` - Cache type definitions
- `next.config.ts` - Service worker configuration

