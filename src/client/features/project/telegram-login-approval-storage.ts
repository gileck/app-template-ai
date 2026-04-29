const STORAGE_KEY = 'pending-telegram-login-approval';

export interface PendingTelegramLoginApproval {
  approvalId: string;
  approvalToken: string;
  expiresAt: string;
  redirectPath: string;
  username: string;
}

export function savePendingTelegramLoginApproval(
  approval: PendingTelegramLoginApproval
) {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(approval));
}

export function readPendingTelegramLoginApproval():
  | PendingTelegramLoginApproval
  | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = sessionStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PendingTelegramLoginApproval;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearPendingTelegramLoginApproval() {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.removeItem(STORAGE_KEY);
}
