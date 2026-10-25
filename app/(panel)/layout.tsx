import { Suspense } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import { getCurrentUser } from "@/lib/auth";
import { FIELD_ROLES, ROLE_LABEL } from "@/lib/roles";

import { AppSidebar, MobileBar, type NavItem, type NavUser } from "./app-nav";

/**
 * Shell aplikasi setelah login (fondasi tata letak shadcn-admin):
 * SidebarProvider -> Sidebar (statis di kiri, md+) + SidebarInset (konten).
 * Mobile memakai Sheet drawer yang dibuka SidebarTrigger di app bar.
 * Ses user dibaca di dalam Suspense (Cache Components).
 */
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Suspense fallback={<ShellFallback>{children}</ShellFallback>}>
        <PanelShell>{children}</PanelShell>
      </Suspense>
    </SidebarProvider>
  );
}

async function PanelShell({ children }: { children: React.ReactNode }) {
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

  const navUser: NavUser = {
    nama: user.nama,
    roleLabel: ROLE_LABEL[user.role],
    regu: user.regu,
  };

  return (
    <>
      <AppSidebar items={items} user={navUser} />
      <SidebarInset>
        <MobileBar items={items} />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </div>
      </SidebarInset>
    </>
  );
}

/** Shell sidebar + inset selama sesi dibaca — lebar sidebar ditiru agar tanpa geser. */
function ShellFallback({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="hidden w-64 shrink-0 md:block" />
      <div className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col gap-3 border-r border-sidebar-border bg-sidebar p-4 pt-6 md:flex">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-3 h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-5 w-3/5" />
      </div>
      <SidebarInset>
        <div className="flex h-12 shrink-0 items-center border-b border-sidebar-border bg-sidebar px-3 md:hidden">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </div>
      </SidebarInset>
    </>
  );
}
