import type { User } from '@/server/database/collections/template/users/types';
import { loginApprovals } from '@/server/database';
import { appConfig } from '@/app.config';
import { sendTelegramNotification } from '@/server/template/telegram';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function createTelegramLoginApproval(user: User): Promise<{
  approvalId: string;
  approvalToken: string;
  expiresAt: string;
} | {
  error: string;
}> {
  if (!user.telegramChatId) {
    return { error: 'Telegram chat ID is not configured for this account.' };
  }

  const approval = await loginApprovals.createLoginApproval({
    userId: user._id,
    username: user.username,
  });

  const sent = await sendTelegramNotification(
    user.telegramChatId,
    [
      '🔐 <b>Login approval requested</b>',
      '',
      `App: <b>${escapeHtml(appConfig.appName)}</b>`,
      `User: <b>${escapeHtml(user.username)}</b>`,
      '',
      'If this was you, approve the login below.',
    ].join('\n'),
    {
      parseMode: 'HTML',
      inlineKeyboard: [[
        {
          text: '✅ Approve Login',
          callback_data: `approve_login:${approval._id.toString()}`,
        },
      ]],
    }
  );

  if (!sent.success) {
    await loginApprovals.deleteLoginApproval(approval._id);
    return {
      error: sent.error || 'Failed to send Telegram login approval',
    };
  }

  return {
    approvalId: approval._id.toString(),
    approvalToken: approval.browserToken,
    expiresAt: approval.expiresAt.toISOString(),
  };
}
