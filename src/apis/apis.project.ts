/**
 * Project-specific API Handlers
 *
 * Add your project-specific API handlers here.
 * Template handlers are in apis.template.ts (synced from template).
 */

import { mergeApiHandlers } from "./registry";
import { chatApiHandlers } from "./project/chat/server";
import { todosApiHandlers } from "./project/todos/server";

export const projectApiHandlers = mergeApiHandlers(
  chatApiHandlers,
  todosApiHandlers
);
