import type {
  RpcConnectionEndedReason,
  RpcConnectionStatus,
} from '@/server/database/collections/template/rpc-connections/types';

export interface RpcConnectionView {
  id: string;
  status: RpcConnectionStatus;
  /** ISO date */
  requestedAt: string;
  /** ISO date — approved sessions only */
  approvedAt?: string;
  /** ISO date — approved sessions: TTL expiry */
  expiresAt?: string;
  /** ISO date — pending sessions: admin-response deadline */
  pendingExpiresAt: string;
  userAgent: string;
  ip: string;
  endedReason?: RpcConnectionEndedReason;
}

export type ConnectRequest = Record<string, never>;

export interface ConnectResponse {
  connection?: RpcConnectionView;
  /** Per-connection bearer token. Returned only on connect; the client must persist it. */
  clientToken?: string;
  error?: string;
}

export type GetCurrentRequest = Record<string, never>;

export interface GetCurrentResponse {
  connection: RpcConnectionView | null;
}

export type StopRequest = Record<string, never>;

export interface StopResponse {
  success: boolean;
}

export interface TestRpcRequest {
  message?: string;
}

export interface TestRpcResponse {
  ok: boolean;
  echo?: string;
  handlerTimestamp?: string;
  handlerHost?: string | null;
  durationMs?: number;
  error?: string;
}
