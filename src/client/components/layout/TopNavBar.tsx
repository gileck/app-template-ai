import { AppBar, Toolbar, IconButton, Box, Button, Avatar, Menu, MenuItem, Typography, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useRouter } from '../../router';
import { NavItem } from '../../components/layout/types';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../settings/SettingsContext';
import { useState } from 'react';
import LoginIcon from '@mui/icons-material/Login';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';

interface TopNavBarProps {
  navItems: NavItem[];
  isStandalone?: boolean;
  onDrawerToggle: () => void;
}

export const TopNavBar = ({ navItems, isStandalone, onDrawerToggle }: TopNavBarProps) => {
  const { currentPath, navigate } = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleLogoutClick = async () => {
    handleMenuClose();
    await logout();
  };

  const handleThemeToggle = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const getThemeIcon = () => {
    return settings.theme === 'light' ? <DarkModeIcon /> : <LightModeIcon />;
  };

  return (
    <AppBar
      position="sticky"
      component="nav"
      sx={{
        // Improve iOS standalone experience
        ...(isStandalone && {
          WebkitBackdropFilter: 'blur(10px)',
          backdropFilter: 'blur(10px)',
        })
      }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                sx={{
                  color: '#fff',
                  backgroundColor: currentPath === item.path ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  mx: 0.5
                }}
                startIcon={item.icon}
                onClick={() => handleNavigation(item.path)}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            color="inherit"
            onClick={handleThemeToggle}
            aria-label="toggle theme"
            title={`Current theme: ${settings.theme}`}
          >
            {getThemeIcon()}
          </IconButton>

          {isAuthenticated ? (
            <Box>
              <IconButton
                onClick={handleAvatarClick}
                sx={{ p: 0 }}
                aria-controls="user-menu"
                aria-haspopup="true"
              >
                <Avatar
                  src={user?.profilePicture}
                  alt={user?.username}
                  sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}
                >
                  {user?.username.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                id="user-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                sx={{ mt: 1 }}
              >
                <MenuItem onClick={handleMenuClose} disabled sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                  <Avatar
                    src={user?.profilePicture}
                    alt={user?.username}
                    sx={{ width: 60, height: 60, mb: 1 }}
                  >
                    {user?.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="subtitle2">
                    {user?.username}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.email}
                  </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleProfileClick}>
                  <AccountCircleIcon fontSize="small" sx={{ mr: 1 }} />
                  Profile
                </MenuItem>
                <MenuItem onClick={handleLogoutClick}>
                  <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Button
              color="inherit"
              onClick={handleLoginClick}
              startIcon={<LoginIcon />}
            >
              Login
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopNavBar;
