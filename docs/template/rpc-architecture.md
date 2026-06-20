---
title: RPC-over-MongoDB Architecture
description: Generic remote function execution system for running server code on a local machine via MongoDB. Use this when working with the RPC daemon or adding new remote handlers.
summary: Vercel inserts jobs into MongoDB, a local daemon polls and executes them, returns results via MongoDB. Used to bypass datacenter IP blocks.
priority: 5
key_points:
  - "`src/server/template/rpc/` - Generic RPC system (zero project-specific code)"
  - "Start daemon: `yarn daemon` or `yarn daemon --verbose` (or `yarn daemon:dev` for tsx --watch + hot handler reload)"
  - "Handlers are modules with a default export async function"
  - "Child-project handlers MUST live under `src/server/project/**` — never under `src/server/template/` (gets overwritten on template sync)"
  - "Security: HMAC-SHA256 job + result signatures (keyed by RPC_SECRET, never persisted) + handler-path allowlist + file existence check"
  - "task-cli config: `agent-tasks/rpc-daemon/config.json`"
---

# RPC-over-MongoDB Architecture

## Problem

Some APIs block requests from Vercel's datacenter IPs (e.g., YouTube transcripts). We need a way to execute functions on a local machine (residential IP) and return results to the Vercel-hosted app.

## Solution

A generic remote function execution system built on MongoDB as a job queue. Fully generic — the `src/server/template/rpc/` folder contains zero project-specific code.

## Flow

```
Vercel (callRemote)         MongoDB (rpc-jobs)         Local Daemon (yarn daemon)
───────────────────         ──────────────────         ──────────────────────────
insert job {                 ──►
  handlerPath,
  args,                      (args normalized: undefined stripped)
  sig,                       (HMAC over handlerPath+args+createdAt+userId)
  status: 'pending'
}
poll every 500ms...                                    poll every 2s
                                                       claim job (pending → processing)
                                                       verify HMAC signature
                                                       resolve path against handler allowlist
                                                       validate file exists on disk
                                                       dynamic import(handlerPath)
                                                       run default export(args)
                             ◄──                       update {status: 'completed',
                                                                result, resultSig}
verify resultSig, return     ◄──
```

The `secret` is **never** written to the job document — `RPC_SECRET` is only an
HMAC key, held by Vercel (signer) and the daemon (verifier). The daemon signs
the result on completion; `callRemote` verifies `resultSig` before returning it,
so a forged DB write can't inject an unauthenticated result.

## File Structure

```
src/server/template/rpc/
├── types.ts          # RpcJobDocument, RpcJobStatus, CallRemoteOptions, RpcResult<T>
├── collection.ts     # MongoDB operations (inline, not in database/collections/)
├── client.ts         # callRemote<T>() — Vercel-side caller (signs + verifies)
├── daemon.ts         # Standalone daemon process (yarn daemon)
├── signature.ts      # HMAC sign/verify for jobs + results, args normalization
├── handler-paths.ts  # resolveAllowedHandlerPath() — handler-root allowlist
└── index.ts          # Barrel — exports callRemote and types
```

## Components

### Client (`client.ts`)

`callRemote<TResult>(handlerPath, args, options?)` — called from Vercel server code when you want to wait for the result.

- Validates the handler path resolves inside an allowlisted handler root (`resolveAllowedHandlerPath`)
- Inserts pending job into MongoDB via `createRpcJob` — which **HMAC-signs** the job's immutable fields and gates via the [connection gate](rpc-connection-gate.md) — or reuses an existing completed/pending job for the same handler+args **and same user**
- **Verifies the result's `resultSig`** before returning, on both the cache-hit and poll-completion paths — a missing/bad signature throws rather than returning unauthenticated data
- Polls every 500ms until completed/failed/timeout/no-daemon
- Defaults: 55s handler timeout, 500ms poll, 1hr DB TTL, 30s `pendingPickupTimeoutMs` (fails fast when no daemon claims the job)

For **fire-and-forget** patterns (long-running daemon jobs whose progress is tracked separately), call `createRpcJob` directly from `@/server/template/rpc/collection`. It's gated by the same connection gate, so direct callers don't bypass authorization.

### Daemon (`daemon.ts`)

Standalone process that runs on a local machine. Start with `yarn daemon` or `yarn daemon --verbose`.

- Loads env vars via `src/server/template/loadEnv`
- Ensures MongoDB indexes on startup (TTL on `expiresAt`, compound on `{status, createdAt}`)
- Polls every 2s for pending jobs
- For each job, validates in order:
  1. **Signature** — recomputes the HMAC over `{handlerPath, args, createdAt, userId}` and constant-time-compares it to the job's `sig`; rejects on mismatch
  2. **Path** — resolved path must sit inside an allowlisted handler root (`resolveAllowedHandlerPath`)
  3. **File** — handler file must exist on disk
- Dynamic imports the handler and calls its default export
- Signs the result (HMAC over `{jobId, result}`) and writes `result` + `resultSig` back to MongoDB (or the error on failure)
- Handles SIGINT/SIGTERM for graceful shutdown with MongoDB connection cleanup

### Collection (`collection.ts`)

MongoDB operations for the `rpc-jobs` collection:

- `ensureRpcIndexes()` — TTL index on `expiresAt` (auto-cleanup), compound on `{status, createdAt}`
- `createRpcJob(job)` — normalizes args (`normalizeForStorage`), HMAC-signs the job, gates via `assertRpcConnection`, inserts the pending job
- `findRecentJob(handlerPath, args, userId)` — find an existing job for the same handler+args **scoped to the calling user** (dedup + per-user cache); normalizes the query args so it matches the stored, undefined-stripped value
- `claimNextPendingJob()` — atomic `findOneAndUpdate` (pending → processing), skips expired jobs
- `completeRpcJob(id, result)` — normalizes the result, signs it (`signRpcResult`), stores `result` + `resultSig`
- `failRpcJob(id, error)` — mark failed

## Handler Convention

Any handler is a module with a **default export** async function:

```typescript
// src/server/project/rpc-handlers/myRemoteHandler.ts
export default async function(args: Record<string, unknown>): Promise<MyResponse> {
  const param = args.param as string;
  // ... execute locally ...
  return { result };
}
```

### Where to put handlers

| Owner | Path | Notes |
|-------|------|-------|
| **Child projects** | `src/server/project/**` | Put all your custom handlers here |
| Template only | `src/server/template/rpc/handlers/**` | Reserved for handlers shipped with the template |

**Do not add child-project handlers under `src/server/template/`.** That folder is template-owned and gets overwritten on every template sync — your handler will disappear. The allowlist (below) admits `src/server/project/**`, so that's where project handlers belong.

## Security

Defense in depth before and after code execution:

1. **HMAC job signature** — `createRpcJob` signs the job's immutable fields (`handlerPath`, `args`, `createdAt`, `userId`) with HMAC-SHA256 keyed by `RPC_SECRET`. The daemon recomputes and constant-time-compares the HMAC before executing. The secret itself is **never written to the DB** — only the signature is. A DB-write attacker can't forge a runnable job without the key.
2. **Handler-path allowlist** — `resolveAllowedHandlerPath` admits only paths resolving inside `src/server/template/rpc/handlers` or `src/server/project` (separator-aware prefix check — rejects `../` traversal *and* sibling dirs like `…-evil`). This is a capability restriction: the daemon `import()`s whatever path a job names, so without an allowlist any default-export function under `src/server/` could be invoked.
3. **File existence** — Handler file must exist on disk before import.
4. **HMAC result signature** — the daemon signs each completed result (HMAC over `{jobId, result}`); `callRemote` verifies it before returning. A forged DB write can't inject an unauthenticated result, and binding to `jobId` prevents cross-job replay.

**Signing/storage consistency**: args and results are run through `normalizeForStorage()` (deep-strips `undefined`) before they're signed *and* stored, so the signed bytes equal exactly what MongoDB persists. This decouples HMAC integrity from the driver's `ignoreUndefined` setting.

**Rolling-deploy caveat**: results without a `resultSig` (legacy rows, or an old daemon) fail verification closed. Deploy Vercel and restart the daemon together so in-flight jobs aren't rejected.

## Configuration

### Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `RPC_SECRET` | Vercel + local `.env.local` | HMAC key for job + result signatures. Must match on both sides; never persisted to the DB. |
| `MONGO_URI` | Vercel + local `.env.local` | MongoDB connection (same database) |
| `RPC_LOCAL_DIRECT` | local `.env.local` only | `true` runs handlers in-process, bypassing the daemon (see below) |

### Local Direct Mode (`RPC_LOCAL_DIRECT`)

For local development you can skip the daemon entirely. With `RPC_LOCAL_DIRECT=true`,
`callRemote` loads the handler with `tsx` and executes it **in the API server
process** — returning the result synchronously instead of inserting a job and
polling MongoDB.

This means **no `yarn daemon`, no Mongo round-trip, and no connection-gate admin
approval** (the gate lives inside `createRpcJob`, which direct mode skips).

Double-guarded so it can never run in production:

```ts
const LOCAL_DIRECT_ENABLED =
  process.env.NODE_ENV !== 'production' &&
  (process.env.RPC_LOCAL_DIRECT ?? '').toLowerCase() === 'true';
```

The `NODE_ENV !== 'production'` half is the safety net: the whole reason RPC
exists is to execute from the local machine's IP (the Vercel datacenter IP is
blocked upstream), so running in-process on Vercel would defeat the purpose. A
stray `RPC_LOCAL_DIRECT=true` on Vercel is therefore ignored. Locally, the API
server *is* the local machine, so in-process execution is equivalent.

The same handler-path allowlist still applies; HMAC signing/verification and the
job cache are not relevant in this mode (the handler runs in-process, so there's
no job document to sign or read back).

### Task Manager

Config: `agent-tasks/rpc-daemon/config.json`

```bash
# Register
task-cli create --config=./agent-tasks/rpc-daemon/config.json

# Start/stop
task-cli run <project>:rpc-daemon
task-cli stop <project>:rpc-daemon
```

## Adding a New Remote Handler

1. Create a module under `src/server/project/` with a default export async function (see [Where to put handlers](#where-to-put-handlers))
2. Call it from Vercel code:
   ```typescript
   import { callRemote } from '@/server/template/rpc';
   const result = await callRemote<MyResponseType>(
     'src/server/project/rpc-handlers/myHandler',
     { arg1: 'value' }
   );
   ```
3. The daemon will automatically pick it up — no registration needed

## Debugging

```bash
# Verbose mode — logs validation steps, args, timing
yarn daemon --verbose

# Check daemon status
task-cli status

# Check for stale/failed jobs in MongoDB
# Jobs auto-expire via TTL index after 1 hour
```

## Related

- **[RPC Connection Gate](rpc-connection-gate.md)** — the authorization layer over this transport. Every `callRemote` from a request-bound caller requires an admin-approved session. The gate is bypassed for system callers (agents, scripts, the daemon itself).
