---
title: Error Handling
description: Guidelines for handling and displaying errors across the application. Use this when implementing error states, catch blocks, or user-facing error messages.
summary: Use `ErrorDisplay` for route/page errors, `errorToast`/`errorToastAuto` for mutation failures, and shared `errorUtils` for classification. Stack traces are admin-only. Never show raw error messages to users.
guidelines:
  - Use `ErrorDisplay` for route/page errors, `errorToast` for mutations
  - "🚨 EVERY useMutation `onError` MUST call `errorToast(message, err)` — empty `onError` is a silent-failure bug. Rollback alone leaves the user with no explanation."
  - "🚨 Mission-critical flows (thread creation, signup, payment) deserve a blocking failure DIALOG with copyable trace + retry, not just a toast."
  - "Never show raw `error.message` — use `cleanErrorMessage()` or `getUserFriendlyMessage()`"
  - Stack traces are admin-only
  - "Always pass error object to `errorToast` (enables copy)"
  - "Use `errorToastAuto(error, fallback)` for automatic classification"
  - "Validation errors use plain `toast.error()`, NOT `errorToast`"
  - Import from specific files to avoid circular deps with bug-report/auth
priority: 2
related_docs:
  - logging-and-error-tracking.md
  - react-query-mutations.md
---

# Error Handling Guidelines

Standard patterns for handling, classifying, and displaying errors throughout the application.

## Overview

```
Error occurs
    │
    ├── Route/page-level error → <ErrorDisplay> component
    ├── Mutation failure       → errorToast() / errorToastAuto()
    ├── React crash            → <ErrorBoundary> (uses ErrorDisplay internally)
    └── Auth-specific          → Local cleanErrorMessage in LoginForm
```

All error handling flows through shared utilities in `src/client/features/template/error-tracking/`.

---

## Shared Utilities

### `errorUtils.ts` — Classification & Formatting

```typescript
import { isNetworkError, cleanErrorMessage, getUserFriendlyMessage, formatErrorForCopy } from '@/client/features/template/error-tracking';
```

| Function | Purpose |
|----------|---------|
| `isNetworkError(error)` | Returns `true` for offline, fetch failures, timeouts |
| `cleanErrorMessage(error)` | Strips `Failed to call {api}:` prefix from apiClient errors |
| `getUserFriendlyMessage(error, fallback?)` | Returns human-friendly message (network, timeout, 413, etc.) |
| `formatErrorForCopy(error)` | Builds copyable string with message + stack trace + server details |

### `errorToast.ts` — Toast with Copy Action

```typescript
import { errorToast, errorToastAuto } from '@/client/features/template/error-tracking';
```

| Function | Purpose |
|----------|---------|
| `errorToast(message, error?)` | Shows toast with your message + "Copy Error" action button |
| `errorToastAuto(error, fallback?)` | Auto-classifies error, then shows toast with Copy action |

### `ErrorDisplay` — Route-Level Error Component

```typescript
import { ErrorDisplay } from '@/client/features/template/error-tracking';
```

Props:
- `error` — the error object (required)
- `title` — heading text (default: "Something went wrong")
- `onRetry` — shows Retry button
- `onBack` / `backLabel` — shows Back button
- `variant` — `'card'` (default, wrapped in Card) or `'inline'` (bare)

Features:
- Network-aware icon (WifiOff vs AlertCircle)
- Collapsible "Error Details" section
- Stack trace visible to **admin users only**
- "Copy Error" button (admins get full details, non-admins get message only)

---

## When to Use What

### Route/Page Error States

Use `<ErrorDisplay>` for query errors shown in the page body:

```tsx
if (error) {
    return (
        <ErrorDisplay
            error={error}
            title="Failed to load items"
            onRetry={() => refetch()}
            onBack={() => navigate('/home')}
        />
    );
}
```

For errors inside a section (not full-page), use `variant="inline"`:

```tsx
<ErrorDisplay error={error} title="Failed to load details" variant="inline" />
```

### Mutation Failures (onError callbacks)

Use `errorToast` when you have a specific user-facing message:

```typescript
onError: (err) => {
    errorToast('Failed to save changes', err);
},
```

#### 🚨 CRITICAL: every mutation onError MUST call errorToast (or equivalent)

This is the most common silent-failure pattern in the codebase. A mutation fails server-side,
`onError` runs and rolls back the optimistic cache update, and the user sees the UI snap back
to the previous state **with no explanation of what went wrong**. Worse, if the rollback
misses a cache key (e.g. you wrote to both messages and threads in `onMutate` but only rolled
back messages), the optimistic state leaks and the UI looks "stuck running".

**Required for every `useMutation`**:

```typescript
useMutation({
    mutationFn: async (vars) => {
        const r = await api.doThing(vars);
        if (r.data?.error) throw new Error(r.data.error);  // throw so onError fires
        return r.data;
    },
    onError: (err, _vars, context) => {
        // ⚠️ REQUIRED. Without this, fire-and-forget callers (.mutate() with no .catch)
        // see nothing when the server rejects.
        errorToast(err instanceof Error ? err.message : 'Failed', err);

        // Roll back EVERY key onMutate touched (not just one).
        if (context?.previousMessages !== undefined) {
            queryClient.setQueryData(messagesKey, context.previousMessages);
        }
        if (context?.previousThreads !== undefined) {
            queryClient.setQueryData(threadsKey, context.previousThreads);
        }
        // ... etc

        // Defensive: invalidate so next fetch returns server truth even if rollback
        // missed a key.
        void queryClient.invalidateQueries({ queryKey: affectedKey });
    },
});
```

**Code-review check**: open every `useMutation` in the diff and verify the `onError`:
- Calls `errorToast(message, err)` — never an empty `() => {}`.
- Rolls back every cache key the `onMutate` wrote to.
- Invalidates queries it touched (defensive — catches a missed rollback key).

**For mission-critical or first-impression flows** (thread creation, account signup, payment
confirmation, etc.), a toast is **not enough**. Use a blocking failure dialog that shows the
error message, a copyable trace, and recovery actions (Retry / Cancel / Open debug logs).
See `ThreadCreationFailureDialog` for the template.

See also: [react-query-mutations.md](./react-query-mutations.md) — the
"🚨 CRITICAL: Mutation Errors MUST Be Visible to the User" section has the full pattern with
anti-pattern examples.

Use `errorToastAuto` when you want automatic classification:

```typescript
catch (error) {
    errorToastAuto(error, 'Failed to submit report.');
}
```

### Validation Errors

For user input errors (not system errors), use plain `toast.error`:

```typescript
if (!title.trim()) {
    toast.error('Please enter a title');
    return;
}
```

Do **not** use `errorToast` for validation — there's no Error object to copy.

---

## Rules

### 1. Never Show Raw Error Messages to Users

Always use `cleanErrorMessage()` or `getUserFriendlyMessage()` instead of `error.message` directly. Raw messages often contain API paths, stack traces, or technical jargon.

### 2. Stack Traces Are Admin-Only

`ErrorDisplay` uses `useIsAdmin()` to gate stack trace visibility. Non-admin users see the cleaned error message only. The Copy button also respects this — admins get full details, non-admins get the message.

### 3. Always Pass the Error Object

When using `errorToast`, pass the actual error so users can copy it:

```typescript
// Good — error is available for copy
errorToast('Failed to delete item', err);

// Bad — no copy action possible
toast.error('Failed to delete item');
```

### 4. Network Errors Get Special Treatment

`isNetworkError()` detects offline state, fetch failures, and timeouts. Both `ErrorDisplay` and `errorToastAuto` automatically show user-friendly network messages ("Connection error. Please check your network...").

### 5. Keep Auth-Specific Error Handling Local

The `LoginForm` has its own `cleanErrorMessage` for auth-specific messages ("Invalid username or password", "Username already taken"). These don't belong in the shared utils.

---

## Server Error Response Format

API error responses include:

```typescript
{
    error: string;           // Error message (always present)
    errorCode?: string;      // 'UNKNOWN_API' | 'FORBIDDEN' | 'SERVER_ERROR'
    errorDetails?: string;   // Stack trace (development mode only)
}
```

The `apiClient` attaches `errorCode` and `errorDetails` to the thrown Error object, so downstream code can access them:

```typescript
catch (err) {
    if (err instanceof Error && 'errorCode' in err) {
        console.log(err.errorCode);    // e.g., 'SERVER_ERROR'
        console.log(err.errorDetails); // Stack trace (dev only)
    }
}
```

---

## Circular Dependency Warning

The `error-tracking` barrel (`index.ts`) re-exports `ErrorBoundary`, which is imported by `bug-report` and `auth` features. To avoid circular imports:

- **Do NOT** import from `'../error-tracking'` (barrel) inside `bug-report` or `auth` files
- **DO** import from the specific file: `'../error-tracking/errorToast'` or `'../error-tracking/errorUtils'`

---

## File Structure

```
src/client/features/template/error-tracking/
├── errorUtils.ts              # isNetworkError, cleanErrorMessage, getUserFriendlyMessage, formatErrorForCopy
├── errorToast.ts              # errorToast, errorToastAuto
├── ErrorDisplay.tsx           # Reusable error display component
├── ErrorBoundary.tsx          # React error boundary (uses ErrorDisplay)
├── useGlobalErrorHandler.ts   # Global window error/rejection handler
├── types.ts                   # TrackedError type
└── index.ts                   # Public exports
```

---

## Related Documentation

- [Logging & Error Tracking](./logging-and-error-tracking.md) — Session logging, bug reports, error tracking infrastructure
- [React Query Mutations](./react-query-mutations.md) — Optimistic updates and onError patterns
