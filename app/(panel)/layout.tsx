import { Suspense } from "react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/roles";

import { LogoutButton } from "./logout-button";

/** Shell aplikasi setelah login. Membaca sesi di dalam Suspense (Cache Components). */
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 glass-strong border-b border-white/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Suspense fallback={<NavSkeleton />}>
            <NavBar />
          </Suspense>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

function NavSkeleton() {
  return (
    <>
      <div className="skeleton h-8 w-32 rounded-lg" />
      <div className="skeleton h-8 w-40 rounded-lg" />
    </>
  );
}

async function NavBar() {
  const user = await getCurrentUser();
  const isMaster = user.role === "SUPER_ADMIN";

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-sm font-bold text-white shadow-md shadow-indigo-500/30"
        >
          SP
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink href="/dashboard">Dashboard</NavLink>
          {isMaster ? (
            <>
              <NavLink href="/master/users">Users</NavLink>
              <NavLink href="/master/checkpoints">Checkpoint</NavLink>
            </>
          ) : null}
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold leading-tight text-slate-800">
            {user.nama}
          </p>
          <p className="text-xs leading-tight text-slate-500">
            {ROLE_LABEL[user.role]}
            {user.regu ? ` · ${user.regu}` : ""}
          </p>
        </div>
        <span className="badge badge-indigo sm:hidden">
          {ROLE_LABEL[user.role]}
        </span>
        <LogoutButton />
      </div>
    </>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-white/70 hover:text-indigo-700 sm:px-3"
    >
      {children}
    </Link>
  );
}
