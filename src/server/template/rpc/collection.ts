import type { Collection, Filter, ObjectId } from 'mongodb';
import { getDb } from '@/server/database/connection';
import { assertRpcConnection, getRpcCallContext } from './connection-gate';
import { signRpcJob, signRpcResult, normalizeForStorage } from './signature';
import type { RpcJobDocument, RpcJobCreate } from './types';

const COLLECTION_NAME = 'rpc-jobs';

async function getCollection(): Promise<Collection<RpcJobDocument>> {
  const db = await getDb();
  return db.collection<RpcJobDocument>(COLLECTION_NAME);
}

export async function ensureRpcIndexes(): Promise<void> {
  const col = await getCollection();
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await col.createIndex({ status: 1, createdAt: 1 });
}

export async function createRpcJob(job: RpcJobCreate): Promise<ObjectId> {
  // Gate here (not just in callRemote) so direct callers — fire-and-forget
  // patterns that don't wait for a result — are also gated.
  await assertRpcConnection();
  const col = await getCollection();
  // Stamp the enqueuing user from the gate context so the job cache can be
  // scoped per-user (system callers have no context → userId stays absent).
  const userId = getRpcCallContext()?.userId;
  // Normalize args to the exact shape Mongo will persist (strips undefined),
  // then sign and store that SAME value — so the daemon's verification recomputes
  // an identical HMAC regardless of the driver's undefined handling.
  const args = normalizeForStorage(job.args);
  // Sign the job's immutable, security-relevant fields. The daemon recomputes
  // this HMAC before executing — the raw RPC_SECRET is never persisted.
  const sig = signRpcJob({
    handlerPath: job.handlerPath,
    args,
    createdAt: job.createdAt,
    userId,
  });
  const doc = { ...job, args, ...(userId ? { userId } : {}), sig } as unknown as RpcJobDocument;
  const result = await col.insertOne(doc);
  return result.insertedId;
}

export async function findRpcJobById(id: ObjectId): Promise<RpcJobDocument | null> {
  const col = await getCollection();
  return col.findOne({ _id: id });
}

export async function claimNextPendingJob(): Promise<RpcJobDocument | null> {
  const col = await getCollection();
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
  return col.findOneAndUpdate(
    {
      expiresAt: { $gt: new Date() },
      $or: [
        { status: 'pending' },
        { status: 'processing', startedAt: { $lt: staleThreshold } },
      ],
    },
    { $set: { status: 'processing', startedAt: new Date() } },
    { sort: { createdAt: 1 }, returnDocument: 'after' }
  );
}

export async function findRecentJob(
  handlerPath: string,
  args: Record<string, unknown>,
  userId?: string
): Promise<RpcJobDocument | null> {
  const col = await getCollection();
  // Match on the normalized args shape that createRpcJob persists, otherwise an
  // undefined-bearing arg would miss the cache (stored stripped vs queried null).
  // Scope the cache to the calling user so one user can never read another
  // user's cached result. `null` matches system-caller jobs (missing userId).
  const filter: Filter<RpcJobDocument> = {
    handlerPath,
    args: normalizeForStorage(args),
    userId: (userId ?? null) as Filter<RpcJobDocument>['userId'],
    status: { $in: ['pending', 'processing', 'completed'] as const },
    expiresAt: { $gt: new Date() },
  };
  return col.findOne(filter, { sort: { createdAt: -1 } });
}

/**
 * Find the most-recent rpc-job for a given assistant-message id —
 * agent jobs put the assistant-message id under `args.sourceMessageId`,
 * so this is the canonical "what happened to my turn?" lookup. Returns
 * null when the job has TTL'd out (1h default).
 */
export async function findRpcJobBySourceMessageId(
  sourceMessageId: string
): Promise<RpcJobDocument | null> {
  const col = await getCollection();
  return col.findOne(
    { 'args.sourceMessageId': sourceMessageId },
    { sort: { createdAt: -1 } }
  );
}

export async function completeRpcJob(id: ObjectId, result: unknown): Promise<void> {
  const col = await getCollection();
  // Normalize then sign the SAME value we persist, so callRemote's verification
  // (over the read-back result) recomputes an identical HMAC. The daemon holds
  // RPC_SECRET, so only it can produce a result a caller will trust.
  const normalized = normalizeForStorage(result);
  const resultSig = signRpcResult(id.toHexString(), normalized);
  await col.updateOne(
    { _id: id },
    { $set: { status: 'completed', result: normalized, resultSig, completedAt: new Date() } }
  );
}

export async function failRpcJob(id: ObjectId, error: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: id },
    { $set: { status: 'failed', error, completedAt: new Date() } }
  );
}
