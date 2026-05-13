---
title: RPC Connection Gate
description: Per-user, admin-approved, TTL-bound session gate over every RPC call. Use this when enabling, configuring, or extending RPC access.
summary: Every `callRemote` is gated behind a session the user has to "Connect" for; an admin approves via Telegram; the session is good for the configured TTL. AsyncLocalStorage propagates userId from the API handler, so every RPC caller is gated transparently with no caller changes.
priority: 5
related_docs:
  - rpc-architecture.md
  - admin.md
  - telegram-notifications.md
key_points:
  - "Admin-only in v1 (route `adminOnly: true` + API name `admin/rpc-connections/*`)"
  - "User clicks Connect → admin approves via Telegram inline button → session is open for `RPC_CONNECTION_TTL_MS` (default 1h)"
  - "Gate runs inside `callRemote`, transparent to every existing/future caller"
  - "AsyncLocalStorage propagates userId — set in `processApiCall`, read in `assertRpcConnection`"
  - "Disable per-deployment with `RPC_CONNECTION_ENABLED=false`"
  - "System callers (agents, scripts, the daemon itself) bypass the gate — they run outside an HTTP request and have no AsyncLocalStorage context"
---

# RPC Connection Gate

A per-user, admin-approved, TTL-bound session gate layered on top of the RPC-over-MongoDB transport described in [rpc-architecture.md](rpc-architecture.md). Without an active session, every `callRemote` from a request-bound context throws `RpcConnectionRequiredError`.

## Why

The RPC daemon executes arbitrary handler code on a residential machine. Even with admin-only API gating, a single leaked cookie would expose every RPC handler. The gate adds:

- **Explicit consent**: the admin must approve each session via Telegram before any RPC executes.
- **Bounded blast radius**: sessions are absolute-TTL'd. A compromised cookie expires automatically.
- **Per-user audit trail**: every approval/rejection/revocation is a database row.

## End-to-end flow

```
Browser                Server (Vercel)              Telegram           Local daemon
───────                ──────────────              ────────           ────────────
                       ┌─ /admin/rpc-connection ─┐
[Connect]   ──► POST   │ connect handler         │
                       │  createRpcConnection     │
                       │   (partial unique index  │
                       │    blocks dup pending)   │
                       │  sendApprovalRequest  ──►│ inline buttons:
                       │                          │ ✅ Approve / ❌ Reject
                       │  returns pending row     │
[poll getCurrent 2s]   │                          │
                       │                       ◄──┤ callback rpc_conn_approve:<id>
                       │ approveRpcConnection     │
                       │  (status: approved,      │
                       │   expiresAt: +TTL)       │
[approved!]            │                          │
                                                              ┌─ any /api/process/*
[Test button] ─► POST  ┤  handler calls          ─► MongoDB ──┤  daemon polls,
                       │  callRemote(...)        ◄── rpc_jobs │  runs test-ping,
                       │   ↳ assertRpcConnection  │           │  writes result
                       │     (ALS → userId →      │           │
                       │      active session?     │           │
                       │      expiresAt > now?)   │
                       │  result returned         │
```

## Data model

Collection: `rpc_connections` at `src/server/database/collections/template/rpc-connections/`.

```ts
interface RpcConnection {
  _id: ObjectId;
  userId: string;
  status: 'pending' | 'approved' | 'revoked' | 'expired';
  requestedAt: Date;
  approvedAt?: Date;        // approved sessions
  expiresAt?: Date;         // approved sessions — TTL deadline
  pendingExpiresAt: Date;   // pending sessions — admin-response deadline
  userAgent: string;
  ip: string;
  endedReason?: 'ttl' | 'user_stop' | 'admin_reject' | 'pending_timeout';
}
```

**Active-session invariant**: a *partial unique index* on `userId` where `status ∈ {pending, approved}` enforces at most one active row per user at the DB layer. The `connect` handler relies on this — duplicate inserts throw `DuplicateActiveConnectionError`.

Revoked / expired rows are kept as an audit trail. No cron sweeper — see [Lazy expiry](#lazy-expiry).

## Architecture

### Server pieces (`src/server/template/rpc/`)

| File | Role |
|---|---|
| `connection-gate.ts` | `AsyncLocalStorage<RpcCallContext>` + `assertRpcConnection()`. Bypasses when no context (system caller). |
| `errors.ts` | `RpcConnectionRequiredError` + `RPC_CONNECTION_REQUIRED_CODE` for the API error code. |
| `config.ts` | `RPC_CONNECTION_ENABLED`, `RPC_CONNECTION_TTL_MS`, `RPC_CONNECTION_PENDING_TIMEOUT_MS`. |
| `connection-approval.ts` | Sends the Telegram approval message; exports `RPC_CONN_APPROVE_ACTION` / `RPC_CONN_REJECT_ACTION` callback constants. |
| `client.ts` | `callRemote` invokes `assertRpcConnection()` first thing. Also added `pendingPickupTimeoutMs` to fail fast when the daemon is down. |

### API surface (`src/apis/template/rpc-connections/`)

All four endpoints are admin-only (named `admin/rpc-connections/*`; `processApiCall` 403s non-admin callers).

| API name | Purpose |
|---|---|
| `admin/rpc-connections/connect` | Insert a pending row, send Telegram approval. |
| `admin/rpc-connections/getCurrent` | Return the user's pending/approved row (with [lazy expiry](#lazy-expiry)) or `null`. |
| `admin/rpc-connections/stop` | Revoke the user's active session (`endedReason: 'user_stop'`). |
| `admin/rpc-connections/test` | Round-trip a minimal `test-ping` handler through the daemon — used by the Test button. |

### Telegram webhook (`src/pages/api/telegram-webhook/handlers/rpc-connection.ts`)

Two callback actions:

- `rpc_conn_approve:<id>` → atomic `approveRpcConnection` (pending → approved with TTL).
- `rpc_conn_reject:<id>` → atomic `rejectPendingRpcConnection` (pending → revoked). **Pending-only**: clicking Reject on an already-approved row is a no-op so an admin can't accidentally nuke an active session.

Both handlers re-validate via the atomic update. The pre-fetch only happens on the unhappy path, to render the correct rejection note ("Unknown", "Already X", "Expired").

### Client (`src/client/routes/template/Connection/`)

Single page at `/admin/rpc-connection` with three states driven by `useCurrentRpcConnection()` (polls every 2s):

| State | Component | Actions |
|---|---|---|
| No session | `IdleState` | Connect |
| Pending approval | `PendingState` | Cancel (= stop) — shows countdown to `pendingExpiresAt` |
| Approved | `ApprovedState` | Stop / Restart / Test — shows countdown to `expiresAt` |

Restart = `stop` then `connect` (chained), so it requires a *fresh* admin approval. There is intentionally no silent-reapproval path.

## AsyncLocalStorage propagation

The gate has to know who is calling `callRemote`, but threading `userId` through every adapter would mean updating every existing and future caller. Instead, `processApiCall` wraps each handler invocation in `runWithRpcCallContext({ userId })`, and `assertRpcConnection` reads from the store via `AsyncLocalStorage`.

```
processApiCall                   callRemote
──────────────                   ──────────
runWithRpcCallContext({userId},
  () => handler(params, ctx)) ──►  assertRpcConnection()
                                     ↳ storage.getStore()  →  { userId }
                                     ↳ findActiveConnectionForUser(userId)
                                     ↳ throw if no row / expired / pending
```

### Bypass rules

| Caller type | What `storage.getStore()` returns | Gate behavior |
|---|---|---|
| HTTP request, authenticated user | `{ userId: 'user_abc' }` | Look up session, throw if no active row or expired. |
| HTTP request, no auth | `{ userId: undefined }` | Throw "no authenticated user in request context." |
| System code (agent, script, daemon) | `undefined` (no ALS context) | **Bypass** — system callers run outside an HTTP request and shouldn't be gated. |
| Explicit bypass (any caller) | `{ bypass: true }` | Bypass. Use sparingly. |

This is why existing AI adapters (`claude-code.ts`, `codex.ts`) didn't need changes — they inherit the context from whichever API handler called them. Background jobs that run outside `processApiCall` keep working unchanged.

## Lazy expiry

Approved sessions expire at `expiresAt`, pending sessions expire at `pendingExpiresAt` — but **no cron sweeps the rows**. Instead:

- **Gate**: rejects `approved` rows where `expiresAt <= now`, ignoring the stored `status` field.
- **`getCurrent`**: returns `null` for any row that's no longer active per `isStillActive(row)`.
- **Telegram handlers**: atomic updates filter on `status: 'pending'` and `pendingExpiresAt > now`. An admin clicking Approve on a stale message gets the right "⏰ Expired" note.

The DB row's `status` field can be stale (e.g., still `'pending'` 30 minutes after the deadline), but no code trusts it without an active-window check. A cron sweeper would only tidy the audit log — skipped for v1.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `RPC_CONNECTION_ENABLED` | `true` | Feature flag. Set to `'false'` to short-circuit `assertRpcConnection` and keep the legacy always-open behavior. |
| `RPC_CONNECTION_TTL_MS` | `3600000` (1 hour) | How long an approved session lasts. Absolute, not sliding. |
| `RPC_CONNECTION_PENDING_TIMEOUT_MS` | `600000` (10 min) | How long a pending request waits for admin approval before lazy-expiring. |

Plus the `callRemote` option **`pendingPickupTimeoutMs`** (default 30s): fail the RPC call with `"No RPC daemon picked up the job within Xms — is 'yarn daemon' running?"` if the job stays `pending` past this. Independent of the connection gate — it surfaces a *transport* problem (no daemon), not a *gate* problem (no session).

## Current constraints

- **Admin-only** (v1): both route and APIs are gated to `ADMIN_USER_ID`. The data model is already per-user — see [Broadening access](#broadening-access).
- **Single admin approver**: the Telegram approval message goes to `ownerTelegramChatId`. Multi-admin approval would need a routing layer.
- **One active session per user**: enforced at the DB layer. Concurrent devices share one session; opening Connect on a second device would conflict with the first's pending row.
- **No daemon-liveness indicator** in the UI. If the daemon is offline, the session can still be `approved` but `Test` will fail with the pending-pickup error. See `pendingPickupTimeoutMs`.
- **No sliding TTL**. Active users still lose their session at the 1-hour mark and have to reconnect.
- **No admin override / TTL extension** from Telegram.
- **No audit-log UI**. Revoked / expired rows accumulate in `rpc_connections` indefinitely.
- **`pending_timeout` is the rollback reason when Telegram send fails** in the `connect` handler. Semantically loose — a future `send_failed` reason would be cleaner.

## Operational notes

### Disabling the gate

Set `RPC_CONNECTION_ENABLED=false` on the affected deployment. `assertRpcConnection` short-circuits before any DB read; existing RPC calls behave as they did before this feature.

### Disabling for a single caller

Wrap the call in a manual ALS context:

```ts
import { runWithRpcCallContext } from '@/server/template/rpc';

await runWithRpcCallContext({ bypass: true }, async () => {
  await callRemote(/* ... */);
});
```

This is the supported escape hatch for an HTTP path that legitimately needs system-mode RPC (e.g., a public endpoint that hits an RPC handler before the user is authenticated). Use sparingly — it's a hole in the gate.

### Debugging "Testing… loads forever"

`callRemote` polls until the job is `completed`. With no daemon running, the job stays `pending`. The `pendingPickupTimeoutMs` (default 30s; the Test endpoint uses 8s) catches this and throws a clear error. If you see a long hang on a non-Test call that uses the 30s default, the daemon is almost certainly offline — run `yarn daemon`.

### MongoDB inspection

```js
// Active sessions across all users
db.rpc_connections.find({ status: { $in: ['pending', 'approved'] } })

// Most recent session history for a user
db.rpc_connections.find({ userId: '...' }).sort({ requestedAt: -1 }).limit(10)

// Recent pending jobs (transport queue, not the gate)
db.rpc_jobs.find({}).sort({ createdAt: -1 }).limit(5)
```

## Broadening access (future)

Today the feature is admin-only by *product decision*, not by data-model constraint. To let non-admin users connect:

1. Rename APIs `admin/rpc-connections/*` → `rpc-connections/*` (or split: keep `admin/*` for a manager view, add user-facing variants).
2. Remove `adminOnly: true` from the route registration.
3. Decide the approval policy. Options:
   - Still admin-approved (single approver per session).
   - Self-approve for trusted user tiers (skip Telegram, mark approved immediately).
   - Multi-admin approval (any admin in a list can approve).

The gate (`assertRpcConnection`), the per-user partial unique index, and all handler scoping (`context.userId`) are already user-scoped — no changes needed there.

## Adding a new gated RPC handler

No changes required. Any new handler called via `callRemote` is automatically gated, because the gate lives in `callRemote` itself. Just follow the handler convention in [rpc-architecture.md](rpc-architecture.md#handler-convention).

For the rare case where a new handler should bypass the gate (e.g., a public health-check ping), use `runWithRpcCallContext({ bypass: true }, ...)` at the API handler that calls it.
