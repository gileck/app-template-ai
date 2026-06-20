import { pathToFileURL } from 'url';
import { createRpcJob, findRpcJobById, findRecentJob } from './collection';
import { assertRpcConnection, getRpcCallContext } from './connection-gate';
import { resolveAllowedHandlerPath } from './handler-paths';
import { verifyRpcResult } from './signature';
import type { CallRemoteOptions, RpcResult } from './types';

const DEFAULT_TIMEOUT_MS = 55_000;
const DEFAULT_POLL_INTERVAL_MS = 500;
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_PENDING_PICKUP_TIMEOUT_MS = 30_000;

// Local-dev shortcut: run the handler in-process instead of queuing a job for
// the daemon. Double-guarded — only when RPC_LOCAL_DIRECT=true AND not in
// production — because in production the whole point of RPC is to execute from
// the local machine's IP (the Vercel datacenter IP is blocked upstream), and
// running in-process there would defeat it. Locally the API server IS the local
// machine, so it's equivalent and saves running `yarn daemon` + admin approval.
const LOCAL_DIRECT_ENABLED =
  process.env.NODE_ENV !== 'production' &&
  (process.env.RPC_LOCAL_DIRECT ?? '').toLowerCase() === 'true';

type RpcHandler = (args: Record<string, unknown>) => Promise<unknown>;

// Verify a completed job's result signature before trusting it. The daemon
// (which holds RPC_SECRET) signs the result on completion; a result row with a
// missing or bad signature means either a forged DB write or a legacy/old-daemon
// job — either way it must not be returned as genuine handler output.
function verifyResultOrThrow<TResult>(job: {
  _id: { toHexString(): string };
  result?: unknown;
  resultSig?: string;
}): TResult {
  if (!verifyRpcResult(job._id.toHexString(), job.result, job.resultSig)) {
    throw new Error('RPC result failed signature verification — refusing to return an unauthenticated result');
  }
  return job.result as TResult;
}

// tsx's programmatic loader can double-wrap the default export through CJS/ESM
// interop (mod.default.default), unlike the daemon's native import(). Unwrap up
// to two levels to find the handler function regardless of how it's nested.
function resolveDefaultExport(mod: unknown): RpcHandler | undefined {
  let candidate: unknown = mod;
  for (let depth = 0; depth < 2 && candidate && typeof candidate === 'object'; depth++) {
    const next = (candidate as { default?: unknown }).default;
    if (typeof next === 'function') return next as RpcHandler;
    candidate = next;
  }
  return typeof candidate === 'function' ? (candidate as RpcHandler) : undefined;
}

// Execute the handler in the current process, loading the .ts file via tsx the
// same way the daemon does (daemon.ts). webpackIgnore keeps webpack from pulling
// the handler — and its heavy, node-only deps — into the Next server bundle;
// these are true runtime imports resolved from node_modules / disk.
async function callHandlerDirect<TResult>(
  handlerPath: string,
  args: Record<string, unknown>
): Promise<RpcResult<TResult>> {
  const resolved = resolveAllowedHandlerPath(handlerPath);
  if (!resolved) {
    throw new Error(`RPC handler path must resolve within an allowlisted handler root, got: "${handlerPath}"`);
  }

  const { tsImport } = (await import(/* webpackIgnore: true */ 'tsx/esm/api')) as {
    tsImport: (specifier: string, parentURL: string) => Promise<unknown>;
  };
  const mod = await tsImport(
    pathToFileURL(resolved).href,
    pathToFileURL(`${process.cwd()}/`).href
  );

  const handler = resolveDefaultExport(mod);
  if (!handler) {
    throw new Error(`Handler at "${handlerPath}" has no default export function`);
  }

  // Note: this path skips the connection gate (which lives inside createRpcJob),
  // so no admin approval is required — intended for local dev only.
  const start = Date.now();
  const data = (await handler(args)) as TResult;
  return { data, durationMs: Date.now() - start };
}

export async function callRemote<TResult>(
  handlerPath: string,
  args: Record<string, unknown>,
  options?: CallRemoteOptions
): Promise<RpcResult<TResult>> {
  if (LOCAL_DIRECT_ENABLED) {
    return callHandlerDirect<TResult>(handlerPath, args);
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const pendingPickupTimeoutMs =
    options?.pendingPickupTimeoutMs ?? DEFAULT_PENDING_PICKUP_TIMEOUT_MS;

  // Connection gate runs inside createRpcJob, so every enqueue (including
  // direct callers that bypass callRemote) is gated at one boundary.

  if (!resolveAllowedHandlerPath(handlerPath)) {
    throw new Error(`RPC handler path must resolve within an allowlisted handler root, got: "${handlerPath}"`);
  }

  // Gate BEFORE reading the cache. The cache short-circuit below returns a
  // completed job's result without ever calling createRpcJob (where the gate
  // otherwise runs), so without this an ungated caller could read a cached
  // result. Also scope the cache lookup to the calling user.
  await assertRpcConnection();
  const userId = getRpcCallContext()?.userId;

  // Reuse a recent job for the same handler+args (and same user) if one exists
  const existing = options?.skipCache ? null : await findRecentJob(handlerPath, args, userId);
  let jobId = existing?._id;

  if (existing?.status === 'completed') {
    return { data: verifyResultOrThrow<TResult>(existing), durationMs: 0 };
  }

  if (!jobId) {
    const now = new Date();
    jobId = await createRpcJob({
      handlerPath,
      args,
      status: 'pending',
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
    });
  }

  const start = Date.now();
  let handlerStart: number | null = null;

  while (true) {
    await sleep(pollIntervalMs);

    const job = await findRpcJobById(jobId);
    if (!job) {
      throw new Error(`RPC job ${jobId.toHexString()} disappeared`);
    }

    if (job.status === 'completed') {
      return {
        data: verifyResultOrThrow<TResult>(job),
        durationMs: Date.now() - start,
      };
    }

    if (job.status === 'failed') {
      throw new Error(`RPC job failed: ${job.error ?? 'unknown error'}`);
    }

    // Start the timeout clock only once the handler is executing
    if (job.status === 'processing' && !handlerStart) {
      handlerStart = job.startedAt?.getTime() ?? Date.now();
    }

    if (handlerStart && Date.now() - handlerStart >= timeoutMs) {
      throw new Error(`RPC call to "${handlerPath}" timed out after ${timeoutMs}ms (handler execution time)`);
    }

    if (
      job.status === 'pending' &&
      Date.now() - start >= pendingPickupTimeoutMs
    ) {
      throw new Error(
        `No RPC daemon picked up the job within ${pendingPickupTimeoutMs}ms — is \`yarn daemon\` running?`
      );
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
