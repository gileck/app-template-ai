import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from '../../router';
import { NavItem } from '../../components/layout/types';
import { logger } from '@/client/features/session-logs';

interface BottomNavBarProps {
  navItems: NavItem[];
}

// Feature name for logging - enable with: window.enableLogs('ios-viewport')
const LOG_FEATURE = 'ios-viewport';

// =============================================================================
// iOS Safari Viewport Offset Hook - Comprehensive Fix
// =============================================================================
// 
// PROBLEMS SOLVED:
// 1. iOS Browser: Bottom toolbar (arrows, tabs) shows/hides during scroll
//    - Scrolling DOWN hides toolbar → visual viewport grows but navbar position wrong
//    - Scrolling UP shows toolbar → visual viewport shrinks
// 2. iOS PWA: Keyboard + auto-scroll causes navbar to get "stuck"
//    - iOS auto-scrolls to keep input visible above keyboard
//    - visualViewport.offsetTop doesn't reset properly after keyboard dismiss
//
// KEY INSIGHT:
// The visual viewport's "bottom edge" position relative to the layout viewport
// determines where our fixed-bottom element should actually be. We calculate:
// 
//   visualViewportBottom = visualViewport.pageTop + visualViewport.height
//   layoutViewportBottom = document.documentElement.scrollTop + window.innerHeight
//   offset = layoutViewportBottom - visualViewportBottom
//
// This correctly handles BOTH the bottom toolbar AND keyboard scenarios.
//
// DEBUG LOGGING:
// Enable in browser console: window.enableLogs('ios-viewport')
// View logs: window.printLogs('ios-viewport')
//
// MAGIC NUMBERS:
// - 16ms: requestAnimationFrame interval (~60fps) for smooth tracking
// - 500ms: Duration to poll after keyboard events (covers iOS animation)
// - 50px: Threshold for "stable" viewport (minor toolbar differences OK)
//

/**
 * Get all viewport measurements for logging
 */
function getViewportMeasurements() {
  if (typeof window === 'undefined' || !window.visualViewport) {
    return null;
  }
  
  const vv = window.visualViewport;
  const scrollTop = document.documentElement.scrollTop || window.scrollY || 0;
  
  return {
    // Visual viewport measurements
    vv_height: Math.round(vv.height),
    vv_width: Math.round(vv.width),
    vv_pageTop: Math.round(vv.pageTop),
    vv_pageLeft: Math.round(vv.pageLeft),
    vv_offsetTop: Math.round(vv.offsetTop),
    vv_offsetLeft: Math.round(vv.offsetLeft),
    vv_scale: vv.scale,
    // Layout viewport measurements
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    scrollTop: Math.round(scrollTop),
    scrollY: Math.round(window.scrollY),
    // Document measurements
    docScrollTop: Math.round(document.documentElement.scrollTop),
    docClientHeight: document.documentElement.clientHeight,
    bodyScrollTop: Math.round(document.body?.scrollTop || 0),
    // Calculated values
    visualBottom: Math.round(vv.pageTop + vv.height),
    layoutBottom: Math.round(scrollTop + window.innerHeight),
  };
}

/**
 * Hook to handle iOS Safari's dynamic viewport issues:
 * - Browser bottom toolbar appearing/disappearing during scroll
 * - Keyboard appearance and the subsequent auto-scroll behavior
 * 
 * @returns The offset in pixels to apply to `bottom` style
 */
function useIOSViewportOffset() {
  // eslint-disable-next-line state-management/prefer-state-architecture -- ephemeral UI state for iOS Safari viewport offset, changes rapidly during scroll
  const [offset, setOffset] = useState(0);
  
  // Refs for managing async operations
  const rafIdRef = useRef<number | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isKeyboardActiveRef = useRef(false);
  const lastStableOffsetRef = useRef(0);
  const stabilityCountRef = useRef(0);
  const lastLoggedOffsetRef = useRef<number | null>(null);
  const pollCountRef = useRef(0);

  /**
   * Calculate the offset needed to position navbar at visual viewport bottom.
   * This accounts for BOTH bottom toolbar visibility AND keyboard presence.
   */
  const calculateOffset = useCallback((): number => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return 0;
    }

    const vv = window.visualViewport;
    
    // Visual viewport bottom edge (in document coordinates)
    // pageTop = scroll offset of visual viewport from document top
    const visualBottom = vv.pageTop + vv.height;
    
    // Layout viewport bottom edge (in document coordinates)
    // This is where position:fixed;bottom:0 would naturally sit
    const scrollTop = document.documentElement.scrollTop || window.scrollY || 0;
    const layoutBottom = scrollTop + window.innerHeight;
    
    // The difference tells us how much the visual viewport bottom
    // is offset from the layout viewport bottom
    // Positive = visual viewport is "above" layout viewport bottom (need to adjust up)
    // This handles both:
    // - Bottom toolbar visible (visual viewport smaller at bottom)
    // - Keyboard pushing content up (visual viewport scrolled)
    const diff = layoutBottom - visualBottom;
    
    return Math.max(0, Math.round(diff));
  }, []);

  /**
   * Update the offset state, but only if value has changed
   * to prevent unnecessary re-renders
   */
  const updateOffset = useCallback((source?: string) => {
    const newOffset = calculateOffset();
    
    // Log when offset changes (not every frame to avoid spam)
    if (lastLoggedOffsetRef.current !== newOffset) {
      const measurements = getViewportMeasurements();
      logger.debug(LOG_FEATURE, `Offset changed: ${lastLoggedOffsetRef.current} → ${newOffset}`, {
        meta: {
          source,
          newOffset,
          prevOffset: lastLoggedOffsetRef.current,
          isKeyboardActive: isKeyboardActiveRef.current,
          isPolling: !!rafIdRef.current,
          ...measurements,
        }
      });
      lastLoggedOffsetRef.current = newOffset;
    }
    
    setOffset(prev => {
      if (prev !== newOffset) {
        return newOffset;
      }
      return prev;
    });
    return newOffset;
  }, [calculateOffset]);

  /**
   * Continuous polling using requestAnimationFrame.
   * Used during keyboard interactions when iOS events are unreliable.
   * Stops automatically after values stabilize.
   */
  const startPolling = useCallback((duration: number, reason: string) => {
    const startTime = Date.now();
    stabilityCountRef.current = 0;
    pollCountRef.current = 0;
    
    logger.debug(LOG_FEATURE, `Polling started: ${reason}`, {
      meta: {
        reason,
        duration,
        isKeyboardActive: isKeyboardActiveRef.current,
        ...getViewportMeasurements(),
      }
    });
    
    const poll = () => {
      pollCountRef.current++;
      const newOffset = updateOffset(`poll-${reason}`);
      const elapsed = Date.now() - startTime;
      
      // Check for stability - same offset for 5 consecutive frames
      if (Math.abs(newOffset - lastStableOffsetRef.current) < 2) {
        stabilityCountRef.current++;
      } else {
        stabilityCountRef.current = 0;
        lastStableOffsetRef.current = newOffset;
      }
      
      // Stop polling if:
      // 1. Duration exceeded AND values are stable (5+ frames)
      // 2. OR duration greatly exceeded (safety limit)
      const isStable = stabilityCountRef.current >= 5;
      const shouldContinue = elapsed < duration || (!isStable && elapsed < duration * 2);
      
      if (shouldContinue) {
        rafIdRef.current = requestAnimationFrame(poll);
      } else {
        logger.debug(LOG_FEATURE, `Polling stopped: ${reason}`, {
          meta: {
            reason,
            elapsed,
            pollCount: pollCountRef.current,
            finalOffset: newOffset,
            stoppedBecause: isStable ? 'stable' : 'timeout',
            ...getViewportMeasurements(),
          }
        });
        rafIdRef.current = null;
      }
    };
    
    // Cancel any existing polling
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    rafIdRef.current = requestAnimationFrame(poll);
  }, [updateOffset]);

  /**
   * Stop all polling operations
   */
  const stopPolling = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    // Log initial state
    logger.info(LOG_FEATURE, 'Hook initialized', {
      meta: {
        userAgent: navigator.userAgent,
        isStandalone: (window.navigator as { standalone?: boolean }).standalone || 
                      window.matchMedia('(display-mode: standalone)').matches,
        ...getViewportMeasurements(),
      }
    });

    // Initial calculation
    updateOffset('init');

    // === Visual Viewport Events ===
    // These fire during scroll (address bar/toolbar changes) and resize
    const handleViewportResize = () => {
      logger.debug(LOG_FEATURE, 'Event: visualViewport.resize', {
        meta: getViewportMeasurements()
      });
      updateOffset('vv-resize');
    };
    
    const handleViewportScroll = () => {
      logger.debug(LOG_FEATURE, 'Event: visualViewport.scroll', {
        meta: getViewportMeasurements()
      });
      updateOffset('vv-scroll');
    };

    window.visualViewport.addEventListener('resize', handleViewportResize);
    window.visualViewport.addEventListener('scroll', handleViewportScroll);

    // === Regular scroll events ===
    // Backup for when visualViewport events don't fire
    // Using passive: true for better scroll performance
    const handleScroll = () => {
      // Only update on scroll if not actively polling (keyboard state)
      if (!rafIdRef.current) {
        updateOffset('window-scroll');
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });

    // === Keyboard Focus Detection ===
    // When input is focused, start continuous polling to track
    // iOS's keyboard animation and auto-scroll behavior
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInput) {
        logger.info(LOG_FEATURE, 'Event: focusin (input)', {
          meta: {
            tagName: target.tagName,
            inputType: (target as HTMLInputElement).type,
            ...getViewportMeasurements(),
          }
        });
        isKeyboardActiveRef.current = true;
        // Poll for 500ms to cover iOS keyboard animation (~300ms) + buffer
        startPolling(500, 'keyboard-open');
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      if (isKeyboardActiveRef.current) {
        const target = e.target as HTMLElement;
        logger.info(LOG_FEATURE, 'Event: focusout (keyboard was active)', {
          meta: {
            tagName: target.tagName,
            ...getViewportMeasurements(),
          }
        });
        isKeyboardActiveRef.current = false;
        // Poll for 500ms to track keyboard dismiss animation
        // iOS often doesn't fire proper events during dismiss
        startPolling(500, 'keyboard-close');
      }
    };

    // === Touch Events ===
    // iOS can scroll during touch without proper events
    const handleTouchMove = () => {
      if (!rafIdRef.current) {
        updateOffset('touchmove');
      }
    };

    const handleTouchEnd = () => {
      logger.debug(LOG_FEATURE, 'Event: touchend', {
        meta: getViewportMeasurements()
      });
      // After touch ends, iOS may animate scroll/toolbar
      // Do a few updates over 300ms to catch the final state
      updateOffset('touchend-0');
      setTimeout(() => updateOffset('touchend-100'), 100);
      setTimeout(() => updateOffset('touchend-200'), 200);
      setTimeout(() => updateOffset('touchend-300'), 300);
    };

    // === App Switching / Tab Changes ===
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        logger.info(LOG_FEATURE, 'Event: visibilitychange (visible)', {
          meta: getViewportMeasurements()
        });
        // App became visible - viewport state may have changed
        startPolling(300, 'visibility-visible');
      }
    };

    // === Window Resize (Orientation Change) ===
    const handleResize = () => {
      logger.info(LOG_FEATURE, 'Event: window.resize', {
        meta: getViewportMeasurements()
      });
      startPolling(500, 'window-resize');
    };

    // Add all event listeners
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      stopPolling();
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      window.visualViewport?.removeEventListener('scroll', handleViewportScroll);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
    };
  }, [updateOffset, startPolling, stopPolling]);

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
        // iOS viewport offset - handles both toolbar show/hide and keyboard
        // When offset is 0, use bottom:0 (normal case)
        // When offset > 0, position navbar above the visual viewport bottom
        bottom: iosOffset > 0 ? `${iosOffset}px` : 0,
        // Safe area insets for notched devices and home indicator
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        // Force GPU layer for smoother updates during scroll
        // This creates a compositing layer, preventing repaints of parent elements
        transform: 'translateZ(0)',
        // Prevent flickering on iOS during rapid updates
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
        // Ensure element doesn't participate in scroll-linked effects incorrectly
        willChange: 'bottom',
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
