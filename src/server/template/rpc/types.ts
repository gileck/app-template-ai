import type { ObjectId } from 'mongodb';

export type RpcJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface RpcJobDocument {
  _id: ObjectId;
  handlerPath: string;
  args: Record<string, unknown>;
  /**
   * HMAC-SHA256 over (handlerPath, args, createdAt, userId) keyed by RPC_SECRET.
   * The daemon recomputes and verifies this before executing — the raw secret
   * is never stored. Optional only for backward-compat reads of legacy rows.
   */
  sig?: string;
  /**
   * Id of the authenticated user that enqueued this job, stamped from the RPC
   * call context. Absent for system callers (agents, scripts, the daemon).
   * Used to scope the job cache so one user can't read another's result.
   */
  userId?: string;
  status: RpcJobStatus;
  result?: unknown;
  /**
   * HMAC-SHA256 over (jobId, result) keyed by RPC_SECRET, written by the daemon
   * when it completes a job. callRemote verifies this before returning a cached
   * or polled result, so a DB-write attacker can't inject a forged result.
   * Optional for backward-compat reads of legacy rows.
   */
  resultSig?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
}

export interface RpcJobCreate {
  handlerPath: string;
  args: Record<string, unknown>;
  status: RpcJobStatus;
  createdAt: Date;
  expiresAt: Date;
}

export interface CallRemoteOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  ttlMs?: number;
  skipCache?: boolean;
  /** Fail with a clear "no daemon" error if the job stays pending this long. Default 30s. */
  pendingPickupTimeoutMs?: number;
}

export interface RpcResult<T> {
  data: T;
  durationMs: number;
}
