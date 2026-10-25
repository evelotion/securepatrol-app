"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "./logout-button";

export type NavItem = {
  href: string;
  label: string;
};

export type NavUser = {
  nama: string;
  roleLabel: string;
  regu: string | null;
};

/**
 * Navigasi aplikasi: sidebar statis di layar besar (lg+),
 * berubah jadi off-canvas drawer yang dibuka tombol hamburger di mobile.
 * Daftar menu & data user dikirim dari Server Component (panel layout).
 */
export function AppNav({ items, user }: { items: NavItem[]; user: NavUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Selalu tutup drawer ketika pindah halaman — pola "adjust state
  // during render" (react.dev), bukan setState di dalam effect.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Selama drawer terbuka: kunci scroll body, Escape menutup,
  // dan reset bila layar melebar ke breakpoint desktop.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onDesktop = () => {
      if (desktop.matches) setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onDesktop);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onDesktop);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const currentLabel = items.find((item) => isActive(item.href))?.label;

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Tutup menu navigasi"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
        />
      ) : null}

      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-[transform,visibility] duration-200 ease-out lg:visible lg:translate-x-0 ${
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-[0.7rem] font-bold text-white">
            SP
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            SecurePatrol
          </span>
        </div>

        <nav
          aria-label="Navigasi utama"
          className="flex flex-col gap-1 overflow-y-auto px-3 pb-4"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                isActive(item.href)
                  ? "bg-indigo-50 font-semibold text-indigo-700"
                  : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-200 px-5 py-4">
          <p className="truncate text-sm font-semibold text-slate-900">
            {user.nama}
          </p>
          <p className="truncate text-xs text-slate-500">
            {user.roleLabel}
            {user.regu ? ` · ${user.regu}` : ""}
          </p>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* App bar mobile: hanya pemicu drawer, tanpa link navigasi. */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu navigasi"
          aria-expanded={open}
          aria-controls="app-sidebar"
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2.5 5h13M2.5 9h13M2.5 13h13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <p className="text-sm font-semibold text-slate-900">
          {currentLabel ?? "SecurePatrol"}
        </p>
      </div>
    </>
  );
}
