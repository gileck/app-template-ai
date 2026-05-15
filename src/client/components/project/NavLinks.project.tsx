/**
 * Project Navigation Items
 *
 * Define your project-specific navigation items here.
 * This file is NOT synced from template - it's owned by your project.
 */

import type { ReactNode } from 'react';
import { NavItem } from '../template/layout/types';
import { Home, MessageSquare, Settings, CheckSquare, Palette, Lightbulb, BarChart3, Bug } from 'lucide-react';
import { RpcConnectionIndicator } from '@/client/features/template/rpc-connection';

/** Project-specific admin menu items */
export const projectAdminMenuItems: NavItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
  { path: '/admin/debug', label: 'Debug', icon: <Bug size={18} /> },
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

/**
 * Optional: custom component rendered in the center of the top nav bar
 * (between the hamburger and the theme/user controls). Return null to
 * leave the slot empty. The slot is centered and capped at max-w-xs.
 */
export const TopNavBarSlot = (): ReactNode => null;

/**
 * Optional: custom component rendered in the right-side controls cluster
 * (before the offline indicator / theme toggle / avatar). Use for status
 * pills like the RPC connection indicator.
 */
export const TopNavBarRightSlot = (): ReactNode => <RpcConnectionIndicator />;
