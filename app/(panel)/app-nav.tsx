"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  ClipboardList,
  House,
  LayoutDashboard,
  MapPin,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Users,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import { LogoutButton } from "./logout-button";

export type NavIcon =
  | "dashboard"
  | "absensi"
  | "patroli"
  | "users"
  | "checkpoints";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

export type NavUser = {
  nama: string;
  roleLabel: string;
  regu: string | null;
};

const IKON_NAV: Record<NavIcon, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  absensi: ClipboardList,
  patroli: MapPin,
  users: Users,
  checkpoints: ScanLine,
};

function isCurrentPage(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Sidebar ruang kontrol — hanya dirender untuk role manager di md ke atas. */
export function AppSidebar({
  items,
  user,
}: {
  items: NavItem[];
  user: NavUser;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  // Tutup drawer tiap pindah halaman — pola "adjust state during render".
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpenMobile(false);
  }

  return (
    <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
      <SidebarHeader>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            SecurePatrol
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Ikon = IKON_NAV[item.icon];
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isCurrentPage(pathname, item.href)}
                      tooltip={item.label}
                      className="h-11"
                    >
                      <Link href={item.href}>
                        <Ikon className="size-4" aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator className="mb-1" />
        <div className="flex items-start gap-2 px-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {user.nama}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.roleLabel}
              {user.regu ? ` · ${user.regu}` : ""}
            </p>
          </div>
          <ThemeToggle className="size-10 shrink-0" />
        </div>
        <LogoutButton />
      </SidebarFooter>
    </Sidebar>
  );
}

/** App bar ruang kontrol: judul halaman aktif, toggle tema, dan profil singkat. */
export function PanelHeader({
  items,
  user,
}: {
  items: NavItem[];
  user: NavUser;
}) {
  const pathname = usePathname();
  const current = items.find((item) => isCurrentPage(pathname, item.href));

  return (
    <header className="app-bar flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-5">
      <SidebarTrigger className="-ml-1 size-11 shrink-0 md:hidden" />
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
        {current?.label ?? "SecurePatrol"}
      </p>
      <p className="hidden min-w-0 truncate text-xs text-muted-foreground md:block">
        {user.nama} · {user.roleLabel}
        {user.regu ? ` · ${user.regu}` : ""}
      </p>
      <ThemeToggle className="size-11 shrink-0" />
    </header>
  );
}

/** App bar staf lapangan: merek + toggle tema. */
export function SecurityBar({ user }: { user: NavUser }) {
  return (
    <header className="app-bar sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-primary-foreground">
        <ShieldCheck className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-foreground">
          {user.nama}
        </p>
        <p className="truncate text-xs leading-tight text-muted-foreground">
          {user.roleLabel}
          {user.regu ? ` · ${user.regu}` : ""}
        </p>
      </div>
      <ThemeToggle className="size-11 shrink-0" />
    </header>
  );
}

const TAB: { href: string; label: string; icon: typeof House }[] = [
  { href: "/beranda", label: "Beranda", icon: House },
  { href: "/patroli", label: "Patroli", icon: ScanLine },
  { href: "/insiden", label: "Insiden", icon: TriangleAlert },
  { href: "/profil", label: "Profil", icon: UserRound },
];

/** Bottom tab bar khusus SECURITY — satu tangan, target sentuh ≥ 48 px. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="tab-bar fixed inset-x-0 bottom-0 z-40 border-t"
    >
      <ul className="mx-auto flex w-full max-w-md items-stretch px-1">
        {TAB.map((tab) => {
          // /absensi adalah sub-layar Beranda, jadi tab Beranda tetap aktif.
          const aktif =
            isCurrentPage(pathname, tab.href) ||
            (tab.href === "/beranda" && isCurrentPage(pathname, "/absensi"));
          const Ikon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={aktif ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] px-1 py-2 text-[0.7rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  aktif
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Ikon
                  className={`size-5 ${aktif ? "" : "opacity-80"}`}
                  aria-hidden="true"
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
