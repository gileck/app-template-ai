import { createHmac, timingSafeEqual } from 'crypto';

/**
 * RPC job authenticity via HMAC, replacing the old "store the shared secret in
 * the job document" scheme. The raw RPC_SECRET never touches the database — the
 * enqueuer signs the job's immutable, security-relevant fields and the daemon
 * recomputes the same HMAC to decide whether to execute. An attacker with DB
 * write access but no RPC_SECRET therefore can't forge an executable job, and a
 * leaked job row no longer leaks the secret.
 *
 * Results are signed symmetrically: the daemon (which holds RPC_SECRET) signs
 * the completed result, and callRemote verifies before returning it — so a
 * DB-write attacker can't inject a forged `result` for a caller to trust.
 */

/**
 * Deep-strip `undefined` so the bytes we sign equal exactly what MongoDB
 * persists — independent of the driver's `ignoreUndefined` option. Object keys
 * with an undefined value are dropped (BSON has no `undefined`); `undefined`
 * array elements become `null` (matching JSON/BSON array semantics). Dates,
 * numbers and nested structures are preserved. Sign and store the SAME
 * normalized value so the verifier (reading the value back from Mongo) always
 * reconstructs an identical structure.
 */
function stripUndefined(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value.map((v) => (v === undefined ? null : stripUndefined(v)));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] = stripUndefined(v);
  }
  return out;
}

/**
 * Normalize a value to the exact shape MongoDB will persist, so the signer
 * (operating on the in-memory value) and the verifier (operating on the
 * read-back value) always agree even if the driver's undefined handling
 * changes. Apply this to BOTH the stored value and the signed value.
 */
export function normalizeForStorage<T>(value: T): T {
  return stripUndefined(value) as T;
}

/**
 * Deterministic JSON: object keys sorted at every level so the signer and the
 * verifier always produce the same string for equal payloads regardless of key
 * insertion order. Dates are bound by their ISO string (BSON dates round-trip
 * back to Date, so both sides serialize identically).
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

function hmac(payload: string): string {
  const secret = process.env.RPC_SECRET;
  if (!secret) throw new Error('RPC_SECRET env var is not set');
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function constantTimeEquals(sig: string | undefined, expected: string): boolean {
  if (!sig) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export interface RpcJobSignaturePayload {
  handlerPath: string;
  args: Record<string, unknown>;
  createdAt: Date;
  userId?: string;
}

function payloadString(p: RpcJobSignaturePayload): string {
  return canonicalize({
    handlerPath: p.handlerPath,
    args: p.args,
    createdAt: p.createdAt.toISOString(),
    userId: p.userId ?? null,
  });
}

/** Compute the HMAC-SHA256 signature for a job. Throws if RPC_SECRET is unset. */
export function signRpcJob(p: RpcJobSignaturePayload): string {
  return hmac(payloadString(p));
}

/** Constant-time verification of a job's stored signature. */
export function verifyRpcJobSignature(p: RpcJobSignaturePayload, sig: string | undefined): boolean {
  if (!process.env.RPC_SECRET) return false;
  return constantTimeEquals(sig, hmac(payloadString(p)));
}

function resultPayloadString(jobId: string, result: unknown): string {
  // jobId binds the signature to one specific job so a result can't be replayed
  // onto a different job row.
  return canonicalize({ jobId, result });
}

/** Sign a completed job's result (daemon-side). Throws if RPC_SECRET is unset. */
export function signRpcResult(jobId: string, result: unknown): string {
  return hmac(resultPayloadString(jobId, result));
}

/** Constant-time verification of a returned result's signature (caller-side). */
export function verifyRpcResult(jobId: string, result: unknown, sig: string | undefined): boolean {
  if (!process.env.RPC_SECRET) return false;
  return constantTimeEquals(sig, hmac(resultPayloadString(jobId, result)));
}
