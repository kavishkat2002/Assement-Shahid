/**
 * @file use-mobile.tsx
 * @description Responsive viewport detection hook for adaptive component rendering.
 *
 * Technical Details:
 * - Monitors media query state against standard mobile breakpoint threshold (768px).
 * - Implements clean listener cleanup on unmount.
 * - Gracefully handles SSR where `window` is undefined during initial evaluation.
 */

import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Hook detecting whether the active viewport width is beneath the mobile threshold.
 *
 * @returns boolean indicating if current viewport is mobile-sized (< 768px)
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // Media query list observing viewport width
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const handleMediaChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    mql.addEventListener("change", handleMediaChange);
    // Initial evaluation on mount
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    return () => mql.removeEventListener("change", handleMediaChange);
  }, []);

  return Boolean(isMobile);
}
