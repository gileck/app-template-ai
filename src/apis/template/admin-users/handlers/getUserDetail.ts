import type { ObjectId } from 'mongodb';
import { findUserById } from '@/server/database/collections/template/users';
import { countCredentialsForUser } from '@/server/database/collections/template/credentials';
import { getPerUserSessionStats } from '@/server/database/collections/template/user-sessions/userSessions';
import { getUserAgentSpend } from '@/server/database/collections/template/agentConversations/messages';
import { toQueryId } from '@/server/template/utils';
import type { AdminUserDetailRequest, AdminUserDetailResponse } from '../types';

export const getUserDetail = async (
  request: AdminUserDetailRequest
): Promise<AdminUserDetailResponse> => {
  if (!request.userId) {
    return { error: 'userId is required' };
  }

  try {
    const user = await findUserById(request.userId);
    if (!user) {
      return { error: 'User not found' };
    }

    const id = user._id.toString();
    const messageUserId = toQueryId(request.userId) as ObjectId;

    const [passkeyCount, sessionStats, agentSpend] = await Promise.all([
      countCredentialsForUser(request.userId),
      getPerUserSessionStats(),
      getUserAgentSpend(messageUserId),
    ]);

    const sessionStat = sessionStats.find((s) => s.userId === id);
    const adminUserId = process.env.ADMIN_USER_ID;

    return {
      user: {
        id,
        username: user.username,
        email: user.email,
        isAdmin: !!adminUserId && id === adminUserId,
        approvalStatus: user.approvalStatus ?? 'approved',
        createdAt: (user.createdAt instanceof Date
          ? user.createdAt
          : new Date(user.createdAt)
        ).toISOString(),
        updatedAt: (user.updatedAt instanceof Date
          ? user.updatedAt
          : new Date(user.updatedAt)
        ).toISOString(),
        approvedAt: user.approvedAt ? user.approvedAt.toISOString() : undefined,
        lastSeenAt: user.lastSeenAt
          ? user.lastSeenAt.toISOString()
          : sessionStat?.lastAt?.toISOString(),
        twoFactorEnabled: user.twoFactorEnabled ?? false,
        twoFactorMethod: user.twoFactorMethod,
        telegramLinked: !!user.telegramChatId,
        passkeyCount,
        sessionsTotal: sessionStat?.total ?? 0,
        lastSessionAt: sessionStat?.lastAt?.toISOString(),
        agentSpend,
      },
    };
  } catch (error: unknown) {
    console.error('[admin/users/detail] error:', error);
    return {
      error:
        error instanceof Error ? error.message : 'Failed to load user detail',
    };
  }
};
