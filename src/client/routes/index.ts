import { Home } from './Home';
import { NotFound } from './NotFound';
import { AIChat } from './AIChat';
import { Settings } from './Settings';
import { Todos } from './Todos';
import { SingleTodo } from './SingleTodo';
import { createRoutes } from '../router';
import { Profile } from './Profile';
import { Reports } from './Reports';
import { Theme } from './Theme';

/**
 * Route definitions with optional metadata.
 * 
 * Simple format (requires auth by default):
 *   '/path': Component
 * 
 * With metadata:
 *   '/path': { component: Component, public: true }
 *   '/admin/path': { component: Component, adminOnly: true }
 */
export const routes = createRoutes({
  // Protected routes (default - require authentication)
  '/': Home,
  '/ai-chat': AIChat,
  '/todos': Todos,
  '/todos/:todoId': SingleTodo,
  '/settings': Settings,
  '/theme': Theme,
  '/profile': Profile,
  
  // Admin routes
  '/admin/reports': Reports,
  
  // Public routes (no authentication required)
  // Example: '/share/:id': { component: SharePage, public: true },
  
  // Fallback
  '/not-found': NotFound,
});
