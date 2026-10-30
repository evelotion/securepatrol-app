"use client";

import { useLayoutEffect } from "react";

import { Moon, MonitorCog, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Tema disimpan di localStorage (`sp-theme`) dan diterapkan skrip inline di
 * <head> sebelum paint. Tanpa pilihan tersimpan, app ikut preferensi sistem.
 */
const KEY = "sp-theme";

function terapkan(gelap: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", gelap);
  root.classList.toggle("light", !gelap);
  root.style.colorScheme = gelap ? "dark" : "light";
}

/** Tombol ikon: terang <-> gelap. */
export function ThemeToggle({ className }: { className?: string }) {
  // React me-reset atribut <html> saat remount Strict Mode di dev;
  // terapkan ulang nilai tersimpan sebelum paint. No-op di produksi.
  useLayoutEffect(() => {
    try {
      const tersimpan = localStorage.getItem(KEY);
      if (tersimpan === "dark" || tersimpan === "light") {
        terapkan(tersimpan === "dark");
      }
    } catch {
      /* localStorage tidak tersedia */
    }
  }, []);

  function toggle() {
    const gelap = !document.documentElement.classList.contains("dark");
    terapkan(gelap);
    try {
      localStorage.setItem(KEY, gelap ? "dark" : "light");
    } catch {
      /* localStorage tidak tersedia */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title="Ganti mode terang / gelap"
      aria-label="Ganti mode terang atau gelap"
      className={cn(
        "tap inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Moon className="size-5 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-5 dark:block" aria-hidden="true" />
    </button>
  );
}

/** Kembali ke tema mengikuti sistem (hapus pilihan manual). */
export function ThemeIkutSistem() {
  function ikutSistem() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* localStorage tidak tersedia */
    }
    terapkan(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  return (
    <button
      type="button"
      onClick={ikutSistem}
      className="tap inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <MonitorCog className="size-4" aria-hidden="true" />
      Ikut sistem
    </button>
  );
}
