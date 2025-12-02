import { NextApiRequest, NextApiResponse } from "next";
import { apiHandlers } from "./apis";
import { createCache } from "@/common/cache";
import { CacheResult } from "@/common/cache/types";
import { fsCacheProvider, s3CacheProvider } from "@/server/cache/providers";
import { appConfig } from "@/app.config";
import { getUserContext } from "./getUserContext";

// Create server-side cache instance
const provider = appConfig.cacheType === 's3' ? s3CacheProvider : fsCacheProvider;
const serverCache = createCache(provider);

export const processApiCall = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<CacheResult<unknown>> => {
  // Parse name from URL parameter - replace underscores with slashes
  // e.g., "auth_me" becomes "auth/me"
  const nameParam = req.query.name as string;
  const name = nameParam.replace(/_/g, '/') as keyof typeof apiHandlers;
  const params = req.body.params;
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

  // Server-side caching is disabled - React Query handles client-side caching
  const result = await serverCache.withCache(
    processWithContext,
    {
      key: name,
      params: { ...params, userId: userContext.userId },
    },
    {
      disableCache: true
    }
  );

  return result;
};