"use client";

import { useEffect } from "react";

/** Daftarkan service worker PWA (hanya di production agar dev tidak basi). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err: unknown) => {
        console.warn("SW registration failed", err);
      });
  }, []);

  return null;
}
