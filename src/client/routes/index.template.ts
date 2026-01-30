/**
 * Template Routes
 *
 * These are core routes provided by the template.
 * Do not modify this file - it will be overwritten during template sync.
 *
 * To add project-specific routes, add them to index.project.ts instead.
 */

import { Settings } from './Settings';
import { Profile } from './Profile';
import { Reports } from './Reports';
import { FeatureRequests, FeatureRequestDetail } from './FeatureRequests';
import { MyFeatureRequests } from './MyFeatureRequests';
import { NotFound } from './NotFound';
import { Theme } from './Theme';
import { Home } from './Home';
import { AIChat } from './AIChat';
import { Todos } from './Todos';
import { SingleTodo } from './SingleTodo';
import { Clarify } from './Clarify';
import { Routes } from '../router';

/**
 * Template route definitions.
 * These are merged with project routes in index.ts.
 */
export const templateRoutes: Routes = {
  // Main routes
  '/': Home,
  '/ai-chat': AIChat,
  '/todos': Todos,
  '/todos/:todoId': SingleTodo,

  // Clarification page (public, full-screen - no header/navbar)
  '/clarify/:issueNumber': { component: Clarify, public: true, fullScreen: true },

  // Template protected routes
  '/settings': Settings,
  '/theme': Theme,
  '/profile': Profile,
  '/my-requests': MyFeatureRequests,

  // Admin routes
  '/admin/reports': Reports,
  '/admin/feature-requests': FeatureRequests,
  '/admin/feature-requests/:requestId': FeatureRequestDetail,

  // Fallback
  '/not-found': NotFound,
};
