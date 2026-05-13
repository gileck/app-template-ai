import apiClient from '@/client/utils/apiClient';
import {
  API_RPC_CONNECTION_CONNECT,
  API_RPC_CONNECTION_GET_CURRENT,
  API_RPC_CONNECTION_STOP,
  API_RPC_CONNECTION_TEST,
} from './index';
import type {
  ConnectRequest,
  ConnectResponse,
  GetCurrentRequest,
  GetCurrentResponse,
  StopRequest,
  StopResponse,
  TestRpcRequest,
  TestRpcResponse,
} from './types';

export const apiConnectRpc = () =>
  apiClient.call<ConnectResponse, ConnectRequest>(
    API_RPC_CONNECTION_CONNECT,
    {} as ConnectRequest
  );

export const apiGetCurrentRpcConnection = () =>
  apiClient.call<GetCurrentResponse, GetCurrentRequest>(
    API_RPC_CONNECTION_GET_CURRENT,
    {} as GetCurrentRequest
  );

export const apiStopRpcConnection = () =>
  apiClient.call<StopResponse, StopRequest>(
    API_RPC_CONNECTION_STOP,
    {} as StopRequest
  );

export const apiTestRpc = (params: TestRpcRequest = {}) =>
  apiClient.call<TestRpcResponse, TestRpcRequest>(
    API_RPC_CONNECTION_TEST,
    params
  );
