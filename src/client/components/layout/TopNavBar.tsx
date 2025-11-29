import { Menu, Moon, SunMedium, LogIn, User, LogOut, WifiOff } from 'lucide-react';
import { useRouter } from '../../router';
import { NavItem } from '../../components/layout/types';
import {
  useAuthStore,
  useUser,
  useLogout,
  useSettingsStore,
  useEffectiveOffline
} from '@/client/features';
import { useState } from 'react';
import { Button } from '@/client/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/client/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/client/components/ui/avatar';
import { Badge } from '@/client/components/ui/badge';

interface TopNavBarProps {
  navItems: NavItem[];
  isStandalone?: boolean;
  onDrawerToggle: () => void;
}

export const TopNavBar = ({ navItems, isStandalone, onDrawerToggle }: TopNavBarProps) => {
  const { currentPath, navigate } = useRouter();

  // Use Zustand stores
  const user = useUser();
  const userHint = useAuthStore((state) => state.userPublicHint);
  const isProbablyLoggedIn = useAuthStore((state) => state.isProbablyLoggedIn);
  const isValidated = useAuthStore((state) => state.isValidated);

  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const effectiveOffline = useEffectiveOffline();

  // Use logout mutation
  const logoutMutation = useLogout();

  // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral dropdown menu state
  const [open, setOpen] = useState(false);

  // Determine if user is authenticated (validated or has hint for instant boot)
  const isAuthenticated = isValidated && !!user;
  // For instant boot, show UI based on hint before validation completes
  const showAuthenticatedUI = isAuthenticated || isProbablyLoggedIn;

  // Display user - use validated user if available, otherwise fall back to hint
  const displayUser = user || (userHint ? {
    username: userHint.name,
    email: userHint.email,
    profilePicture: userHint.avatar,
  } : null);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleMenuClose = () => setOpen(false);

  const handleProfileClick = () => { handleMenuClose(); navigate('/profile'); };

  const handleLogoutClick = async () => {
    handleMenuClose();
    logoutMutation.mutate();
  };

  const handleThemeToggle = () => { updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' }); };

  const getThemeIcon = () => settings.theme === 'light' ? <Moon size={18} /> : <SunMedium size={18} />;

  return (
    <>
      <nav className={`sticky top-0 z-40 border-b bg-background/80 backdrop-blur ${isStandalone ? 'backdrop-blur-md' : ''}`}>
        <div className="mx-auto flex h-14 w-full max-w-screen-lg items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="open drawer" onClick={onDrawerToggle}>
              <Menu size={18} />
            </Button>
            <div className="hidden sm:block">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant={currentPath === item.path ? 'secondary' : 'ghost'}
                  className="mx-0.5"
                  onClick={() => handleNavigation(item.path)}
                >
                  <span className="mr-2 inline-flex">{item.icon}</span>
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {effectiveOffline && (
              <Badge variant="outline" className="gap-1 border-orange-500 text-orange-600 dark:border-orange-400 dark:text-orange-400">
                <WifiOff size={12} />
                <span className="hidden sm:inline">Offline</span>
              </Badge>
            )}

            <Button variant="ghost" size="icon" onClick={handleThemeToggle} title={`Current theme: ${settings.theme}`} aria-label="toggle theme">
              {getThemeIcon()}
            </Button>

            {showAuthenticatedUI ? (
              <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="user menu">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={displayUser?.profilePicture} alt={displayUser?.username} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {displayUser?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{displayUser?.username}</span>
                      <span className="text-xs text-muted-foreground">{displayUser?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleProfileClick}>
                    <User className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogoutClick} disabled={logoutMutation.isPending}>
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={handleLoginClick}>
                <LogIn className="mr-2 h-4 w-4" /> Login
              </Button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default TopNavBar;
