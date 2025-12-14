import { useEffect, useState, useCallback } from 'react';
import { useRouter } from '../../router';
import { NavItem } from '../../components/layout/types';

interface BottomNavBarProps {
  navItems: NavItem[];
}

/**
 * Hook to handle iOS Safari's dynamic viewport (address bar hide/show)
 * Returns the offset needed to keep fixed bottom elements properly positioned
 */
function useIOSViewportOffset() {
  const [offset, setOffset] = useState(0);

  const updateOffset = useCallback(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      // Calculate the difference between layout viewport and visual viewport
      // This difference occurs when Safari's address bar is visible
      const layoutHeight = window.innerHeight;
      const visualHeight = window.visualViewport.height;
      const visualOffsetTop = window.visualViewport.offsetTop;
      
      // The offset is how much the visual viewport is shifted from the bottom
      const newOffset = layoutHeight - visualHeight - visualOffsetTop;
      setOffset(Math.max(0, newOffset));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    // Initial calculation
    updateOffset();

    // Listen to viewport changes (address bar hide/show)
    window.visualViewport.addEventListener('resize', updateOffset);
    window.visualViewport.addEventListener('scroll', updateOffset);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateOffset);
      window.visualViewport?.removeEventListener('scroll', updateOffset);
    };
  }, [updateOffset]);

  return offset;
}

export const BottomNavBar = ({ navItems }: BottomNavBarProps) => {
  const { currentPath, navigate } = useRouter();
  const iosOffset = useIOSViewportOffset();

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div 
      className="fixed inset-x-0 z-40 block border-t bg-background sm:hidden"
      style={{
        // Use bottom with iOS offset to handle Safari's dynamic viewport
        bottom: `${iosOffset}px`,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        // iOS Safari fixes for fixed positioning during scroll
        transform: 'translate3d(0, 0, 0)',
        WebkitTransform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      <div 
        className="mx-auto grid max-w-screen-lg gap-1 px-2 pt-1"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}
      >
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavigation(item.path)}
              aria-current={active ? 'page' : undefined}
              className={`flex h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium transition-colors ${
                active
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <span className={active ? 'text-primary' : 'text-muted-foreground'}>{item.icon}</span>
              <span className="leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavBar;
