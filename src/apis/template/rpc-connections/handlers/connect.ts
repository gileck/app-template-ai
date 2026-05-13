import type { ApiHandlerContext } from '@/apis/template/auth/types';
import {
  createRpcConnection,
  DuplicateActiveConnectionError,
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

  // Reconcile any stored-active-but-clock-expired rows. Without this the
  // partial unique index would block the insert even though getCurrent (lazy
  // expiry) already shows the user as not-connected.
  await expireStaleConnectionForUser(context.userId);

  let connection;
  try {
    connection = await createRpcConnection({
      userId: context.userId,
      userAgent: context.userAgent ?? 'unknown',
      ip: context.ip ?? 'unknown',
      pendingTtlMs: RPC_CONNECTION_PENDING_TIMEOUT_MS,
    });
  } catch (err) {
    if (err instanceof DuplicateActiveConnectionError) {
      return { error: 'You already have an active or pending connection. Stop it first to reconnect.' };
    }
    throw err;
  }

  const sent = await sendRpcConnectionApprovalRequest(connection);
  if (!sent.success) {
    // Telegram failed → roll back the pending row so the user can retry
    // after fixing the Telegram config.
    await endRpcConnection(connection._id, 'pending_timeout');
    return { error: sent.error ?? 'Failed to send approval request to admin.' };
  }

  return { connection: toRpcConnectionView(connection) };
};
