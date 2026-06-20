import { API_LIST_USERS, API_GENERATE_PASSKEY_LINK, API_GET_USER_DETAIL } from './index';
import { listUsers } from './handlers/listUsers';
import { generatePasskeyLink } from './handlers/generatePasskeyLink';
import { getUserDetail } from './handlers/getUserDetail';

export * from './index';

export const adminUsersApiHandlers = {
  [API_LIST_USERS]: { process: listUsers },
  [API_GENERATE_PASSKEY_LINK]: { process: generatePasskeyLink },
  [API_GET_USER_DETAIL]: { process: getUserDetail },
};
