import type { UserResponse } from '@/apis/template/auth/types';

export interface CompleteTelegramLoginApprovalRequest {
  approvalId: string;
  approvalToken: string;
}

export type TelegramLoginApprovalCompletionStatus =
  | 'pending'
  | 'authenticated'
  | 'expired'
  | 'invalid';

export interface CompleteTelegramLoginApprovalResponse {
  status: TelegramLoginApprovalCompletionStatus;
  user?: UserResponse;
  expiresAt?: string;
}
