import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiConnectRpc,
  apiGetCurrentRpcConnection,
  apiStopRpcConnection,
} from '@/apis/template/rpc-connections/client';
import type {
  ConnectResponse,
  GetCurrentResponse,
  RpcConnectionView,
  StopResponse,
} from '@/apis/template/rpc-connections/types';
import { useQueryDefaults } from '@/client/query';
import { useOptimisticMutation } from '@/client/query';

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
  return useOptimisticMutation<RpcConnectionView, void>({
    mutationFn: async () => {
      const result = await apiConnectRpc();
      const data = result.data as ConnectResponse | undefined;
      if (data?.error) throw new Error(data.error);
      if (!data?.connection) {
        throw new Error('Connect did not return a connection');
      }
      return data.connection;
    },
    affectedKeys: [rpcConnectionQueryKey],
    onSuccess: (connection) => {
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
  return useOptimisticMutation<StopResponse, void>({
    mutationFn: async () => {
      const result = await apiStopRpcConnection();
      return (result.data as StopResponse | undefined) ?? { success: false };
    },
    affectedKeys: [rpcConnectionQueryKey],
    applyOptimistic: (_vars, qc) => {
      qc.setQueryData<RpcConnectionView | null>(rpcConnectionQueryKey, null);
    },
    errorMessage: (err) =>
      err instanceof Error ? err.message : 'Failed to stop RPC connection',
  });
}
