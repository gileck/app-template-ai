import { useEffect } from 'react';
import { useRouter } from '../../router';
import { NavItem } from '../../components/layout/types';

interface BottomNavBarProps {
  navItems: NavItem[];
}

/**
 * Simple iOS keyboard fix: when an input loses focus (keyboard closes),
 * do a tiny scroll "jiggle" to force iOS to recalculate its viewport.
 * 
 * This fixes the iOS PWA bug where the bottom navbar gets stuck after
 * the keyboard closes.
 */
function useIOSKeyboardFix() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' ||
                      target.tagName === 'TEXTAREA' ||
                      target.isContentEditable;

      if (isInput) {
        // Tiny scroll jiggle to force iOS to recalculate viewport
        // This is a well-known workaround for iOS Safari/PWA viewport bugs
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          window.scrollTo(window.scrollX, scrollY + 1);
          requestAnimationFrame(() => {
            window.scrollTo(window.scrollX, scrollY);
          });
        });
      }
    };

    document.addEventListener('focusout', handleFocusOut);
    return () => document.removeEventListener('focusout', handleFocusOut);
  }, []);
}

export const BottomNavBar = ({ navItems }: BottomNavBarProps) => {
  const { currentPath, navigate } = useRouter();
  useIOSKeyboardFix();

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 block border-t bg-background sm:hidden"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
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
              className={`flex h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium transition-colors ${active
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
