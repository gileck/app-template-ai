import type { ApiHandlerContext } from '@/apis/template/auth/types';
import {
  createRpcConnection,
  endActiveConnectionForUser,
  endRpcConnection,
  expireStaleConnectionForUser,
} from '@/server/database/collections/template/rpc-connections/rpc-connections';
import { RPC_CONNECTION_PENDING_TIMEOUT_MS } from '@/server/template/rpc/config';
import { sendRpcConnectionApprovalRequest } from '@/server/template/rpc/connection-approval';
import type { ConnectRequest, ConnectResponse } from '../types';
import { toRpcConnectionView } from './shared';

export const connect = async (
  _request: ConnectRequest,
  context: ApiHandlerContext
): Promise<ConnectResponse> => {
  if (!context.userId) return { error: 'Not authenticated' };

  // Connect = "give me a fresh approved session". Any prior row is
  // superseded: stale-by-clock rows are tidied to 'expired', a still-active
  // row is force-revoked (its token dies with it). Without this the partial
  // unique index would block the new insert.
  await expireStaleConnectionForUser(context.userId);
  await endActiveConnectionForUser(context.userId, 'user_stop');

  const connection = await createRpcConnection({
    userId: context.userId,
    userAgent: context.userAgent ?? 'unknown',
    ip: context.ip ?? 'unknown',
    pendingTtlMs: RPC_CONNECTION_PENDING_TIMEOUT_MS,
  });

  const sent = await sendRpcConnectionApprovalRequest(connection);
  if (!sent.success) {
    // Telegram failed → roll back the pending row so the user can retry
    // after fixing the Telegram config.
    await endRpcConnection(connection._id, 'pending_timeout');
    return { error: sent.error ?? 'Failed to send approval request to admin.' };
  }

  return {
    connection: toRpcConnectionView(connection),
    clientToken: connection.clientToken,
  };
};
