/**
 * @file setup.ts
 * @description Global Vitest test environment bootstrap and browser API polyfills.
 *
 * Mocks & Stubs Configured:
 * 1. `@testing-library/jest-dom/vitest`: Extends Vitest's `expect` with custom DOM element matchers
 *    (e.g., `.toBeInTheDocument()`, `.toHaveClass()`, `.toHaveAttribute()`).
 * 2. `window.scrollTo`: jsdom does not implement layout scrolling; mocked with a no-op function
 *    to prevent runtime errors when route navigation scrolls to top.
 * 3. `window.matchMedia`: Polyfills CSS media query evaluation for hooks such as `useIsMobile`.
 */

import "@testing-library/jest-dom/vitest";

// Mock window.scrollTo to prevent unhandled jsdom TypeError exceptions
Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

// Polyfill window.matchMedia for viewport breakpoint detection and responsive testing
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (mediaQueryString: string) => ({
    matches: false,
    media: mediaQueryString,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
