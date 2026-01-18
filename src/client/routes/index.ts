import { Home } from './Home';
import { NotFound } from './NotFound';
import { AIChat } from './AIChat';
import { Settings } from './Settings';
import { Todos } from './Todos';
import { SingleTodo } from './SingleTodo';
import { createRoutes } from '../router';
import { Profile } from './Profile';
import { Reports } from './Reports';
import { FeatureRequests } from './FeatureRequests';
import { MyFeatureRequests } from './MyFeatureRequests';
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
 *
 * REMINDER: When adding a new route, consider if it should be added to:
 *   - navItems (bottom nav bar) in src/client/components/NavLinks.tsx
 *   - menuItems (hamburger menu) in src/client/components/NavLinks.tsx
 *
 * Routes that typically DON'T need menu entries:
 *   - Dynamic routes like '/todos/:todoId' (accessed via in-app links)
 *   - '/not-found' (fallback route)
 *   - '/profile' (accessed via avatar in header)
 *   - Public share pages (accessed via direct links)
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
  '/my-requests': MyFeatureRequests,

  // Admin routes
  '/admin/reports': Reports,
  '/admin/feature-requests': FeatureRequests,
  
  // Public routes (no authentication required)
  // Example: '/share/:id': { component: SharePage, public: true },
  
  // Fallback
  '/not-found': NotFound,
});
