import { NextApiRequest, NextApiResponse } from "next";
import { apiHandlers } from "./apis";
import { createCache } from "@/common/cache";
import { CacheResult } from "@/common/cache/types";
import type { ApiOptions } from "@/client/utils/apiClient";
import { fsCacheProvider, s3CacheProvider } from "@/server/cache/providers";
import { appConfig } from "@/app.config";
import { getUserContext } from "./getUserContext";

// Create server-side cache instance
const provider = appConfig.cacheType === 's3' ? s3CacheProvider : fsCacheProvider;
const serverCache = createCache(provider);

// Constants

export const processApiCall = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<CacheResult<unknown>> => {
  const name = req.body.name as keyof typeof apiHandlers;
  const params = req.body.params;
  const options = req.body.options as ApiOptions;
  const apiHandler = apiHandlers[name];
  if (!apiHandler) {
    throw new Error(`API handler not found for name: ${name}`);
  }
  const userContext = getUserContext(req, res);

  // Create a wrapped function that handles context internally
  const processWithContext = () => {
    const processFunc = apiHandler.process;

    try {
      // Now all process functions expect two parameters
      return (processFunc as (params: unknown, context: unknown) => Promise<unknown>)(params, userContext);
    } catch (error) {
      console.error(`Error processing API call ${name}:`, error);
      throw error;
    }
  };

  const result = await serverCache.withCache(
    processWithContext,
    {
      key: name,
      params: { ...params, userId: userContext.userId },
    },
    {
      bypassCache: options?.bypassCache || false,
      disableCache: true
    }
  );

  return result;
};