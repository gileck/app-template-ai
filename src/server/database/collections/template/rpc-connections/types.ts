import type { ObjectId } from 'mongodb';

export type RpcConnectionStatus =
  | 'pending'
  | 'approved'
  | 'revoked'
  | 'expired';

export type RpcConnectionEndedReason =
  | 'ttl'
  | 'user_stop'
  | 'admin_reject'
  | 'pending_timeout';

export interface RpcConnection {
  _id: ObjectId;
  userId: string;
  status: RpcConnectionStatus;
  requestedAt: Date;
  approvedAt?: Date;
  expiresAt?: Date;
  pendingExpiresAt: Date;
  userAgent: string;
  ip: string;
  endedReason?: RpcConnectionEndedReason;
}

export interface CreateRpcConnectionParams {
  userId: string;
  userAgent: string;
  ip: string;
  pendingTtlMs: number;
}
