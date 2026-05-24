export * from './index';

import {
    API_LIST_CONVERSATIONS,
    API_GET_CONVERSATION,
    API_CREATE_CONVERSATION,
    API_DELETE_CONVERSATION,
    API_SEND_MESSAGE,
    API_CANCEL_MESSAGE,
    API_GET_TRACES,
} from './index';
import { listConversations } from './handlers/listConversations';
import { getConversation } from './handlers/getConversation';
import { createConversation } from './handlers/createConversation';
import { deleteConversation } from './handlers/deleteConversation';
import { sendMessage } from './handlers/sendMessage';
import { cancelMessage } from './handlers/cancelMessage';
import { getTraces } from './handlers/getTraces';

export const agentApiHandlers = {
    [API_LIST_CONVERSATIONS]: { process: listConversations },
    [API_GET_CONVERSATION]: { process: getConversation },
    [API_CREATE_CONVERSATION]: { process: createConversation },
    [API_DELETE_CONVERSATION]: { process: deleteConversation },
    [API_SEND_MESSAGE]: { process: sendMessage },
    [API_CANCEL_MESSAGE]: { process: cancelMessage },
    [API_GET_TRACES]: { process: getTraces },
};
