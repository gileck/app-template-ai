export * from './index';

import {
  API_RPC_CONNECTION_CONNECT,
  API_RPC_CONNECTION_GET_CURRENT,
  API_RPC_CONNECTION_STOP,
} from './index';
import { connect } from './handlers/connect';
import { getCurrent } from './handlers/getCurrent';
import { stop } from './handlers/stop';

export const rpcConnectionsApiHandlers = {
  [API_RPC_CONNECTION_CONNECT]: { process: connect },
  [API_RPC_CONNECTION_GET_CURRENT]: { process: getCurrent },
  [API_RPC_CONNECTION_STOP]: { process: stop },
};
