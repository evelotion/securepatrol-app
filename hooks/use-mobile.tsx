import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * true bila lebar layar < 768px.
 * Pakai useSyncExternalStore (bukan setState di effect) agar bebas cascading
 * render dan aman saat SSR: server selalu menganggap false.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  );
}
