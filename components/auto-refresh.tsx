"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

/**
 * Menyegarkan data server component secara berkala (polling ringan lewat
 * `router.refresh()`). Berhenti saat tab tersembunyi dan menyegarkan segera
 * begitu tab kembali terlihat.
 */
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const segarkan = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const timer = window.setInterval(segarkan, intervalMs);
    document.addEventListener("visibilitychange", segarkan);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", segarkan);
    };
  }, [intervalMs, router]);

  return null;
}
