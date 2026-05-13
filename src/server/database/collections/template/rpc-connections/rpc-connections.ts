import { Collection, ObjectId } from 'mongodb';
import { getDb } from '../../../connection';
import type {
  CreateRpcConnectionParams,
  RpcConnection,
  RpcConnectionEndedReason,
} from './types';

const COLLECTION_NAME = 'rpc_connections';
const ACTIVE_STATUSES = ['pending', 'approved'] as const;

let indexesEnsured: Promise<void> | null = null;

function toId(id: string | ObjectId): ObjectId | null {
  if (id instanceof ObjectId) return id;
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

async function getRpcConnectionsCollection(): Promise<Collection<RpcConnection>> {
  const db = await getDb();
  const collection = db.collection<RpcConnection>(COLLECTION_NAME);

  // Promise-based memo so concurrent first-callers share one createIndex.
  if (!indexesEnsured) {
    indexesEnsured = collection.createIndex(
      { userId: 1 },
      {
        unique: true,
        partialFilterExpression: { status: { $in: [...ACTIVE_STATUSES] } },
        name: 'rpc_connections_active_user_unique',
      }
    ).then(() => undefined);
  }
  await indexesEnsured;

  return collection;
}

export function isStillActive(connection: RpcConnection): boolean {
  const now = Date.now();
  if (connection.status === 'pending') {
    return connection.pendingExpiresAt.getTime() > now;
  }
  if (connection.status === 'approved') {
    return !!connection.expiresAt && connection.expiresAt.getTime() > now;
  }
  return false;
}

export class DuplicateActiveConnectionError extends Error {
  constructor() {
    super('User already has an active RPC connection');
    this.name = 'DuplicateActiveConnectionError';
  }
}

export async function createRpcConnection(
  params: CreateRpcConnectionParams
): Promise<RpcConnection> {
  const collection = await getRpcConnectionsCollection();
  const now = new Date();

  const document: RpcConnection = {
    _id: new ObjectId(),
    userId: params.userId,
    status: 'pending',
    requestedAt: now,
    pendingExpiresAt: new Date(now.getTime() + params.pendingTtlMs),
    userAgent: params.userAgent,
    ip: params.ip,
  };

  try {
    await collection.insertOne(document);
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) {
      throw new DuplicateActiveConnectionError();
    }
    throw err;
  }
  return document;
}

export async function findActiveConnectionForUser(
  userId: string
): Promise<RpcConnection | null> {
  const collection = await getRpcConnectionsCollection();
  return collection.findOne({
    userId,
    status: { $in: [...ACTIVE_STATUSES] },
  });
}

export async function findRpcConnectionById(
  id: string | ObjectId
): Promise<RpcConnection | null> {
  const objectId = toId(id);
  if (!objectId) return null;
  const collection = await getRpcConnectionsCollection();
  return collection.findOne({ _id: objectId });
}

export async function approveRpcConnection(
  id: string | ObjectId,
  ttlMs: number
): Promise<RpcConnection | null> {
  const objectId = toId(id);
  if (!objectId) return null;

  const collection = await getRpcConnectionsCollection();
  const now = new Date();
  const result = await collection.findOneAndUpdate(
    { _id: objectId, status: 'pending', pendingExpiresAt: { $gt: now } },
    {
      $set: {
        status: 'approved',
        approvedAt: now,
        expiresAt: new Date(now.getTime() + ttlMs),
      },
    },
    { returnDocument: 'after' }
  );
  return result ?? null;
}

export async function rejectPendingRpcConnection(
  id: string | ObjectId
): Promise<RpcConnection | null> {
  const objectId = toId(id);
  if (!objectId) return null;

  const collection = await getRpcConnectionsCollection();
  const result = await collection.findOneAndUpdate(
    { _id: objectId, status: 'pending' },
    { $set: { status: 'revoked', endedReason: 'admin_reject' } },
    { returnDocument: 'after' }
  );
  return result ?? null;
}

export async function endRpcConnection(
  id: string | ObjectId,
  reason: RpcConnectionEndedReason
): Promise<RpcConnection | null> {
  const objectId = toId(id);
  if (!objectId) return null;

  const nextStatus =
    reason === 'user_stop' || reason === 'admin_reject' ? 'revoked' : 'expired';

  const collection = await getRpcConnectionsCollection();
  const result = await collection.findOneAndUpdate(
    { _id: objectId, status: { $in: [...ACTIVE_STATUSES] } },
    { $set: { status: nextStatus, endedReason: reason } },
    { returnDocument: 'after' }
  );
  return result ?? null;
}

export async function endActiveConnectionForUser(
  userId: string,
  reason: RpcConnectionEndedReason
): Promise<RpcConnection | null> {
  const nextStatus =
    reason === 'user_stop' || reason === 'admin_reject' ? 'revoked' : 'expired';

  const collection = await getRpcConnectionsCollection();
  const result = await collection.findOneAndUpdate(
    { userId, status: { $in: [...ACTIVE_STATUSES] } },
    { $set: { status: nextStatus, endedReason: reason } },
    { returnDocument: 'after' }
  );
  return result ?? null;
}
