import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiConnectRpc,
  apiGetCurrentRpcConnection,
  apiStopRpcConnection,
  apiTestRpc,
} from '@/apis/template/rpc-connections/client';
import type {
  ConnectResponse,
  GetCurrentResponse,
  RpcConnectionView,
  StopResponse,
  TestRpcResponse,
} from '@/apis/template/rpc-connections/types';
import { useQueryDefaults } from '@/client/query';
import { useOptimisticMutation } from '@/client/query';
import { useRpcConnectionTokenStore } from '@/client/features/template/rpc-connection';

export const rpcConnectionQueryKey = ['rpc-connections', 'current'] as const;

export function useCurrentRpcConnection() {
  const queryDefaults = useQueryDefaults();

  return useQuery({
    queryKey: rpcConnectionQueryKey,
    queryFn: async (): Promise<RpcConnectionView | null> => {
      const result = await apiGetCurrentRpcConnection();
      const data = result.data as GetCurrentResponse | undefined;
      return data?.connection ?? null;
    },
    ...queryDefaults,
    refetchInterval: 2000,
    refetchIntervalInBackground: false,
  });
}

export function useConnectRpc() {
  const queryClient = useQueryClient();
  const setToken = useRpcConnectionTokenStore((s) => s.setToken);
  return useOptimisticMutation<
    { connection: RpcConnectionView; clientToken: string },
    void
  >({
    mutationFn: async () => {
      const result = await apiConnectRpc();
      const data = result.data as ConnectResponse | undefined;
      if (data?.error) throw new Error(data.error);
      if (!data?.connection || !data?.clientToken) {
        throw new Error('Connect did not return a connection');
      }
      return { connection: data.connection, clientToken: data.clientToken };
    },
    affectedKeys: [rpcConnectionQueryKey],
    onSuccess: ({ connection, clientToken }) => {
      // Persist token BEFORE the next getCurrent poll fires so the server
      // recognizes us as the owning device.
      setToken(clientToken);
      queryClient.setQueryData<RpcConnectionView | null>(
        rpcConnectionQueryKey,
        connection
      );
    },
    errorMessage: (err) =>
      err instanceof Error
        ? err.message
        : 'Failed to start RPC connection request',
  });
}

export function useStopRpc() {
  const clearToken = useRpcConnectionTokenStore((s) => s.clearToken);
  return useOptimisticMutation<StopResponse, void>({
    mutationFn: async () => {
      const result = await apiStopRpcConnection();
      return (result.data as StopResponse | undefined) ?? { success: false };
    },
    affectedKeys: [rpcConnectionQueryKey],
    applyOptimistic: (_vars, qc) => {
      qc.setQueryData<RpcConnectionView | null>(rpcConnectionQueryKey, null);
      clearToken();
    },
    errorMessage: (err) =>
      err instanceof Error ? err.message : 'Failed to stop RPC connection',
  });
}

export function useTestRpc() {
  return useMutation<TestRpcResponse, Error, string | undefined>({
    mutationFn: async (message) => {
      const result = await apiTestRpc(message ? { message } : {});
      const data = result.data as TestRpcResponse | undefined;
      if (!data) throw new Error('Empty response');
      if (data.error && !data.ok) throw new Error(data.error);
      return data;
    },
  });
}
