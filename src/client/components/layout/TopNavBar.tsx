import { Menu, Moon, SunMedium, LogIn, User, LogOut } from 'lucide-react';
import { useRouter } from '../../router';
import { NavItem } from '../../components/layout/types';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../settings/SettingsContext';
import { useState } from 'react';
import { Button } from '@/client/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/client/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/client/components/ui/avatar';

interface TopNavBarProps {
  navItems: NavItem[];
  isStandalone?: boolean;
  onDrawerToggle: () => void;
}

export const TopNavBar = ({ navItems, isStandalone, onDrawerToggle }: TopNavBarProps) => {
  const { currentPath, navigate } = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [open, setOpen] = useState(false);

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
    await logout();
  };

  const handleThemeToggle = () => { updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' }); };

  const getThemeIcon = () => settings.theme === 'light' ? <Moon size={18} /> : <SunMedium size={18} />;

  return (
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
          <Button variant="ghost" size="icon" onClick={handleThemeToggle} title={`Current theme: ${settings.theme}`} aria-label="toggle theme">
            {getThemeIcon()}
          </Button>

          {isAuthenticated ? (
            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="user menu">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.profilePicture} alt={user?.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user?.username}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogoutClick}>
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
  );
};

export default TopNavBar;
