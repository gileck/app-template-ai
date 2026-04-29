import apiClient from '@/client/utils/apiClient';
import { COMPLETE_TELEGRAM_LOGIN_APPROVAL } from './index';
import type {
  CompleteTelegramLoginApprovalRequest,
  CompleteTelegramLoginApprovalResponse,
} from './types';

export const apiCompleteTelegramLoginApproval = (
  params: CompleteTelegramLoginApprovalRequest
) => {
  return apiClient.call<
    CompleteTelegramLoginApprovalResponse,
    CompleteTelegramLoginApprovalRequest
  >(COMPLETE_TELEGRAM_LOGIN_APPROVAL, params).then((response) => {
    const maybeError = (response.data as { error?: string } | undefined)?.error;
    if (maybeError) {
      throw new Error(maybeError);
    }
    return response;
  });
};
