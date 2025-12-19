import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from '../../router';
import { NavItem } from '../../components/layout/types';

interface BottomNavBarProps {
  navItems: NavItem[];
}

/**
 * Hook to handle iOS Safari's dynamic viewport (address bar hide/show + keyboard)
 * Returns the offset needed to keep fixed bottom elements properly positioned
 * 
 * Handles:
 * - Address bar show/hide during scroll
 * - Keyboard appear/dismiss
 * - App switching (visibility change)
 * - Orientation changes
 */
function useIOSViewportOffset() {
  // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral UI state for iOS Safari viewport offset, changes rapidly during scroll
  const [offset, setOffset] = useState(0);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isKeyboardOpenRef = useRef(false);

  // Force reset offset to 0
  const forceReset = useCallback(() => {
    setOffset(0);
  }, []);

  const updateOffset = useCallback(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      // Calculate the difference between layout viewport and visual viewport
      // This difference occurs when Safari's address bar is visible or keyboard is open
      const layoutHeight = window.innerHeight;
      const visualHeight = window.visualViewport.height;
      const visualOffsetTop = window.visualViewport.offsetTop;
      
      // The offset is how much the visual viewport is shifted from the bottom
      const newOffset = layoutHeight - visualHeight - visualOffsetTop;
      setOffset(Math.max(0, newOffset));
    }
  }, []);

  // Delayed reset - handles iOS Safari's delayed viewport updates after keyboard dismisses
  const scheduleReset = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    
    // Wait 300ms for iOS to settle after keyboard dismisses
    resetTimeoutRef.current = setTimeout(() => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        const layoutHeight = window.innerHeight;
        const visualHeight = window.visualViewport.height;
        
        // If viewport is back to normal (within 50px threshold), reset
        if (Math.abs(layoutHeight - visualHeight) < 50) {
          forceReset();
        } else {
          updateOffset();
        }
      }
    }, 300);
  }, [updateOffset, forceReset]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    // Initial calculation
    updateOffset();

    // Listen to viewport changes (address bar hide/show)
    window.visualViewport.addEventListener('resize', updateOffset);
    window.visualViewport.addEventListener('scroll', updateOffset);

    // Keyboard focus detection
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;
      
      if (isInput) {
        isKeyboardOpenRef.current = true;
        // Let iOS adjust viewport before recalculating
        setTimeout(updateOffset, 100);
      }
    };

    const handleFocusOut = () => {
      if (isKeyboardOpenRef.current) {
        isKeyboardOpenRef.current = false;
        // Schedule reset check after keyboard dismisses
        scheduleReset();
      }
    };

    // Handle app switching (returning to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Recalculate when returning to app
        setTimeout(updateOffset, 100);
      }
    };

    // Add event listeners
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', updateOffset); // Orientation changes

    return () => {
      window.visualViewport?.removeEventListener('resize', updateOffset);
      window.visualViewport?.removeEventListener('scroll', updateOffset);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', updateOffset);
      
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [updateOffset, scheduleReset]);

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
