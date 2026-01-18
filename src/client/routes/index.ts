/**
 * Route Definitions
 *
 * This file defines the app's routes by merging template routes with project routes.
 * Template routes are in index.template.ts (synced from template).
 *
 * Add your project-specific routes below.
 *
 * Route formats:
 *   '/path': Component                              // Requires auth (default)
 *   '/path': { component: Component, public: true } // Public route
 *   '/admin/path': Component                        // Admin only (automatic)
 *
 * REMINDER: When adding a new route, consider if it should be added to:
 *   - navItems (bottom nav bar) in src/client/components/NavLinks.tsx
 *   - menuItems (hamburger menu) in src/client/components/NavLinks.tsx
 */

import { createRoutes } from '../router';
import { templateRoutes } from './index.template';
import { Home } from './Home';
import { AIChat } from './AIChat';
import { Todos } from './Todos';
import { SingleTodo } from './SingleTodo';

export const routes = createRoutes({
  // Template routes (settings, profile, admin, etc.)
  ...templateRoutes,

  // Project routes:
  '/': Home,
  '/ai-chat': AIChat,
  '/todos': Todos,
  '/todos/:todoId': SingleTodo,

  // Add more project routes here:
  // '/my-page': MyPage,
  // '/share/:id': { component: SharePage, public: true },
});
