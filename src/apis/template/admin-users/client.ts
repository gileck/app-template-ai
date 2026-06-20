import apiClient from '@/client/utils/apiClient';
import { API_LIST_USERS, API_GENERATE_PASSKEY_LINK, API_GET_USER_DETAIL } from './index';
import type {
  AdminUsersListResponse,
  AdminUserDetailRequest,
  AdminUserDetailResponse,
  GeneratePasskeyLinkRequest,
  GeneratePasskeyLinkResponse,
} from './types';

export const apiListUsers = () => {
  return apiClient.call<AdminUsersListResponse>(API_LIST_USERS, {});
};

export const apiGetUserDetail = (params: AdminUserDetailRequest) => {
  return apiClient.call<AdminUserDetailResponse, AdminUserDetailRequest>(
    API_GET_USER_DETAIL,
    params
  );
};

export const apiGeneratePasskeyLink = (params: GeneratePasskeyLinkRequest) => {
  return apiClient.call<GeneratePasskeyLinkResponse, GeneratePasskeyLinkRequest>(
    API_GENERATE_PASSKEY_LINK,
    params
  );
};
