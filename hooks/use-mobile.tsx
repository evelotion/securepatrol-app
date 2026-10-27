import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * true bila lebar layar < 768px.
 *
 * Server selalu menganggap false (desktop) lewat `getServerSnapshot`.
 * Kebutuhan bentuk DOM tidak lagi bergantung pada nilai ini — lihat komentar
 * pada komponen `Sidebar` di components/ui/sidebar.tsx — sehingga aman dari
 * hydration mismatch meski konteks terbaca setelah mount.
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
