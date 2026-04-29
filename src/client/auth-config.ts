/**
 * Auth Client Configuration
 *
 * Configure the login/signup UI behavior for your project.
 * This file is project-owned and will not be overwritten by template sync.
 *
 * IMPORTANT: This controls UI only. To fully disable registration,
 * you must ALSO add a validateRegistration override in src/apis/auth-overrides.ts
 * to reject registration requests on the server side.
 */
import {
  savePendingTelegramLoginApproval,
  type PendingTelegramLoginApproval,
} from '@/client/features/project/telegram-login-approval-storage';

interface AuthConfig {
  allowRegistration: boolean;
  onTelegramLoginApprovalRequested?: (
    approval: PendingTelegramLoginApproval
  ) => string | void;
}

export const authConfig: AuthConfig = {
  /**
   * Set to false to hide the registration option from the login form.
   * NOTE: This is a UI-only setting. Direct API calls can still register users
   * unless you also add a validateRegistration server override.
   */
  allowRegistration: true,
  onTelegramLoginApprovalRequested: (approval) => {
    savePendingTelegramLoginApproval(approval);
    return `/telegram-login-approval?id=${encodeURIComponent(approval.approvalId)}`;
  },
};
