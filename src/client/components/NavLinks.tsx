import { NavItem } from './layout/types';
import { Home, MessageSquare, Settings, CheckSquare } from 'lucide-react';

export const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: <Home size={18} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={18} /> },
];

export const menuItems: NavItem[] = [
  { path: '/', label: 'Home', icon: <Home size={18} /> },
  { path: '/ai-chat', label: 'AI Chat', icon: <MessageSquare size={18} /> },
  { path: '/todos', label: 'Todos', icon: <CheckSquare size={18} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={18} /> },
];
