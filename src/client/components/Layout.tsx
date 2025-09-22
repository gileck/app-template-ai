import { ReactNode, useState } from 'react';
import {
  Box,
  Container,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { TopNavBar } from './layout/TopNavBar';
import { BottomNavBar } from './layout/BottomNavBar';
import { DrawerMenu } from './layout/DrawerMenu';
import { Footer } from './layout/Footer';
import { NavigatorStandalone } from './layout/types';
import { navItems, menuItems } from './NavLinks';


export const Layout = ({ children }: { children?: ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isStandalone = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as NavigatorStandalone).standalone);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      // Add iOS-specific styles when in standalone mode
      ...(isStandalone && isMobile && {
        // Ensure content is below the iOS status bar
        paddingTop: 'env(safe-area-inset-top)',
        // Ensure content is not covered by the home indicator on newer iPhones
        paddingBottom: 'env(safe-area-inset-bottom)',
        // Ensure content is not covered by the notch
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      })
    }}>
      {/* Top Navigation Bar */}
      <TopNavBar
        navItems={navItems}
        isStandalone={isStandalone}
        onDrawerToggle={handleDrawerToggle}
      />

      {/* Mobile Drawer Menu */}
      <DrawerMenu
        navItems={menuItems}
        mobileOpen={mobileOpen}
        onDrawerToggle={handleDrawerToggle}
      />

      {/* Main Content */}
      <Container component="main" sx={{
        flexGrow: 1,
        py: 3,
        px: { xs: 0.5, sm: 3 },
        maxWidth: { xs: '100%', sm: 'md', md: 'lg' },
        // Add iOS momentum scrolling for a more native feel
        WebkitOverflowScrolling: 'touch',
        // Add bottom padding on mobile to account for bottom navigation
        pb: { xs: 7, sm: 3 }
      }}>
        {children}
      </Container>

      {/* Footer (hidden on mobile) */}
      <Footer isStandalone={isStandalone} />

      {/* Bottom Navigation (mobile only) */}
      <BottomNavBar navItems={navItems} isStandalone={isStandalone} />
    </Box>
  );
};
