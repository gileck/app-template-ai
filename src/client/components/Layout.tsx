import { ReactNode, useState } from 'react';
import { TopNavBar } from './layout/TopNavBar';
import { BottomNavBar } from './layout/BottomNavBar';
import { DrawerMenu } from './layout/DrawerMenu';
import { Footer } from './layout/Footer';
import { NavigatorStandalone } from './layout/types';
import { navItems, menuItems } from './NavLinks';


export const Layout = ({ children }: { children?: ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isStandalone = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as NavigatorStandalone).standalone);
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <div className={`flex min-h-screen flex-col ${isStandalone && isMobile ? 'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]' : ''}`}>
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
      <main className="mx-auto w-full max-w-screen-lg flex-1 px-2 py-3 pb-20 sm:px-4 sm:pb-4">
        {children}
      </main>

      {/* Footer (hidden on mobile) */}
      <Footer isStandalone={isStandalone} />

      {/* Bottom Navigation (mobile only) */}
      <BottomNavBar navItems={navItems} isStandalone={isStandalone} />
    </div>
  );
};
