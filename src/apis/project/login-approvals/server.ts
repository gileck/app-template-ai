export * from './index';

import { COMPLETE_TELEGRAM_LOGIN_APPROVAL } from './index';
import { completeTelegramLoginApproval } from './handlers/completeTelegramLoginApproval';

export const loginApprovalsApiHandlers = {
  [COMPLETE_TELEGRAM_LOGIN_APPROVAL]: { process: completeTelegramLoginApproval },
};
