import { Suspense } from "react";

import { getCurrentUser } from "@/lib/auth";
import { FIELD_ROLES, ROLE_LABEL } from "@/lib/roles";

import { AppNav, type NavItem } from "./app-nav";

/**
 * Shell aplikasi setelah login.
 * Navbar atas dihapus: desktop pakai sidebar statis di kiri (w-64),
 * mobile pakai app bar tipis + hamburger drawer (lihat AppNav).
 * Ses user dibaca di dalam Suspense (Cache Components).
 */
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <Suspense fallback={<NavFallback />}>
        <PanelNav />
      </Suspense>

      {/* Konten digeser sebaris sidebar desktop. */}
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

async function PanelNav() {
  const user = await getCurrentUser();

  const items: NavItem[] = [{ href: "/dashboard", label: "Dashboard" }];
  if (FIELD_ROLES.includes(user.role)) {
    items.push(
      { href: "/absensi", label: "Absensi" },
      { href: "/patroli", label: "Patroli" },
    );
  }
  if (user.role === "SUPER_ADMIN") {
    items.push(
      { href: "/master/users", label: "Master User" },
      { href: "/master/checkpoints", label: "Master Checkpoint" },
    );
  }

  return (
    <AppNav
      items={items}
      user={{
        nama: user.nama,
        roleLabel: ROLE_LABEL[user.role],
        regu: user.regu,
      }}
    />
  );
}

/** Shell sidebar/app bar selama sesi dibaca — tanpa layout shift. */
function NavFallback() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="px-5 pt-5 pb-4">
          <div className="skeleton h-8 w-32 rounded-lg" />
        </div>
        <div className="flex flex-col gap-3 px-3">
          <div className="skeleton h-5 w-full rounded" />
          <div className="skeleton h-5 w-4/5 rounded" />
          <div className="skeleton h-5 w-3/5 rounded" />
        </div>
      </aside>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden">
        <div className="skeleton h-5 w-28 rounded" />
      </div>
    </>
  );
}
