/**
 * AI Usage Console Route Hooks
 *
 * Read-only admin page — single query over the S3 AI-usage records +
 * per-user agent spend.
 */

import { useQuery } from '@tanstack/react-query';
import { getAiUsageConsole } from '@/apis/template/agent-admin/client';
import type { AiUsageConsole } from '@/apis/template/agent-admin/types';
import { useQueryDefaults } from '@/client/query';

const aiUsageQueryKey = ['agent-admin', 'ai-usage'] as const;

export function useAiUsageConsole() {
    const queryDefaults = useQueryDefaults();
    return useQuery({
        ...queryDefaults,
        queryKey: aiUsageQueryKey,
        queryFn: async (): Promise<AiUsageConsole> => {
            const result = await getAiUsageConsole();
            if (result.data?.error) throw new Error(result.data.error);
            if (!result.data?.console) throw new Error('AI usage data unavailable');
            return result.data.console;
        },
    });
}
