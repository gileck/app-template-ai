import type { ApiHandlerContext } from '@/apis/template/auth/types';
import {
  findActiveConnectionForUser,
  isStillActive,
} from '@/server/database/collections/template/rpc-connections/rpc-connections';
import type { GetCurrentRequest, GetCurrentResponse } from '../types';
import { toRpcConnectionView } from './shared';

export const getCurrent = async (
  _request: GetCurrentRequest,
  context: ApiHandlerContext
): Promise<GetCurrentResponse> => {
  if (!context.userId) return { connection: null };

  const active = await findActiveConnectionForUser(context.userId);
  if (!active || !isStillActive(active)) return { connection: null };

  return { connection: toRpcConnectionView(active) };
};
