/**
 * Project-Specific Routes
 *
 * Add your project-specific routes here.
 * This file is NOT synced from template - it's owned by your project.
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

import { Routes } from '../router';
import { Home } from './Home';
import { AIChat } from './AIChat';
import { Todos } from './Todos';
import { SingleTodo } from './SingleTodo';

/**
 * Project route definitions.
 * These are merged with template routes in index.ts.
 */
export const projectRoutes: Routes = {
  // Example app routes (template demo):
  '/': Home,
  '/ai-chat': AIChat,
  '/todos': Todos,
  '/todos/:todoId': SingleTodo,

  // Add more project-specific routes here:
  // '/my-page': MyPage,
  // '/share/:id': { component: SharePage, public: true },
};
