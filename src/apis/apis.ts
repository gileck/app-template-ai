/**
 * API Handlers
 *
 * This file merges template API handlers with project-specific handlers.
 * Template handlers are in apis.template.ts (synced from template).
 *
 * Add your project-specific API handlers below.
 */

import { mergeApiHandlers } from "./registry";
import { templateApiHandlers } from "./apis.template";
import { chatApiHandlers } from "./chat/server";
import { todosApiHandlers } from "./todos/server";
import { clarificationApiHandlers } from "./clarification/server";

export const apiHandlers = mergeApiHandlers(
  templateApiHandlers,
  chatApiHandlers,
  todosApiHandlers,
  clarificationApiHandlers
  // Add project-specific API handlers here:
  // myApiHandlers,
);
