import { Suspense } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/roles";

import {
  AppSidebar,
  BottomNav,
  PanelHeader,
  SecurityBar,
  type NavItem,
  type NavUser,
} from "./app-nav";

/**
 * Dua wajah aplikasi (Fase 3):
 *
 * - SECURITY (staf lapangan): tanpa sidebar, app bar + bottom tab bar
 *   (Beranda, Patroli, Insiden, Profil), konten satu kolom maksimal 28rem.
 * - Manager (Danru/Chief/Admin): ruang kontrol dengan sidebar statis di md+
 *   dan drawer di HP. Tinggi layar dikunci agar hanya konten yang scroll.
 */
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ShellFallback>{children}</ShellFallback>}>
      <PanelShell>{children}</PanelShell>
    </Suspense>
  );
}

async function PanelShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  const navUser: NavUser = {
    nama: user.nama,
    roleLabel: ROLE_LABEL[user.role],
    regu: user.regu,
  };

  if (user.role === "SECURITY") {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <SecurityBar user={navUser} />
        <main className="mx-auto w-full max-w-md flex-1 px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-4">
          {children}
        </main>
        <BottomNav />
      </div>
    );
  }

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  ];
  if (user.role === "SUPER_ADMIN") {
    items.push(
      { href: "/master/users", label: "Master User", icon: "users" },
      {
        href: "/master/checkpoints",
        label: "Master Checkpoint",
        icon: "checkpoints",
      },
    );
  }

  return (
    <SidebarProvider className="h-screen max-h-dvh overflow-hidden">
      <AppSidebar items={items} user={navUser} />
      <SidebarInset className="flex h-full min-w-0 flex-col overflow-hidden">
        <PanelHeader items={items} user={navUser} />
        <div className="min-h-0 w-full flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ShellFallback({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="h-14 shrink-0 border-b border-border px-4 py-4">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-3 h-4 w-64" />
        <Skeleton className="mt-6 h-56 rounded-[var(--radius)]" />
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
