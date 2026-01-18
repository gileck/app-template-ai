import { mergeApiHandlers } from "./registry";
import { chatApiHandlers } from "./chat/server";
import { clearCacheApiHandlers } from "./settings/clearCache/server";
import { authApiHandlers } from "./auth/server";
import { todosApiHandlers } from "./todos/server";
import { reportsApiHandlers } from "./reports/server";
import { featureRequestsApiHandlers } from "./feature-requests/server";

export const apiHandlers = mergeApiHandlers(
  chatApiHandlers,
  clearCacheApiHandlers,
  authApiHandlers,
  todosApiHandlers,
  reportsApiHandlers,
  featureRequestsApiHandlers
);


