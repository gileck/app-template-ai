/**
 * Project Navigation Items
 *
 * This file defines the app's navigation menus.
 * Admin items and utilities are imported from NavLinks.template.tsx (synced from template).
 *
 * Customize navItems and menuItems for your project's needs.
 */

import { NavItem } from './layout/types';
import { Home, MessageSquare, Settings, CheckSquare, Palette, Lightbulb, BarChart3 } from 'lucide-react';

// Re-export template items and utilities
import { adminMenuItems as templateAdminMenuItems, filterAdminNavItems } from './NavLinks.template';
export { filterAdminNavItems };

/** Admin-only menu items (includes template items + project-specific) */
export const adminMenuItems: NavItem[] = [
  ...templateAdminMenuItems,
  { path: '/admin/dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
];

/** Bottom navigation bar items */
export const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: <Home size={18} /> },
  { path: '/todos', label: 'Todos', icon: <CheckSquare size={18} /> },
  { path: '/ai-chat', label: 'AI Chat', icon: <MessageSquare size={18} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={18} /> },
];

/** Regular app menu items (non-admin) */
export const menuItems: NavItem[] = [
  { path: '/', label: 'Home', icon: <Home size={18} /> },
  { path: '/ai-chat', label: 'AI Chat', icon: <MessageSquare size={18} /> },
  { path: '/todos', label: 'Todos', icon: <CheckSquare size={18} /> },
  { path: '/my-requests', label: 'My Requests', icon: <Lightbulb size={18} /> },
  { path: '/theme', label: 'Theme', icon: <Palette size={18} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={18} /> },
];
