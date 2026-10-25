"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export type NavItem = {
  href: string;
  label: string;
};

export type NavUser = {
  nama: string;
  roleLabel: string;
  regu: string | null;
};

function isCurrentPage(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sidebar shadcn (fondasi shadcn-admin): statis di kiri pada layar md+,
 * berubah jadi Sheet drawer yang dibuka SidebarTrigger di mobile.
 * Daftar menu & data user dikirim dari Server Component (panel layout).
 */
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
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-[0.7rem] font-bold text-primary-foreground">
            SP
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
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isCurrentPage(pathname, item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator className="mb-1" />
        <div className="px-2">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">
            {user.nama}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/70">
            {user.roleLabel}
            {user.regu ? ` · ${user.regu}` : ""}
          </p>
        </div>
        <LogoutButton />
      </SidebarFooter>
    </Sidebar>
  );
}

/** App bar mobile: pemicu drawer + judul halaman aktif. Hanya di bawah md. */
export function MobileBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const current = items.find((item) => isCurrentPage(pathname, item.href));

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-3 md:hidden">
      <SidebarTrigger className="-ml-1 shrink-0" />
      <p className="truncate text-sm font-semibold text-sidebar-foreground">
        {current?.label ?? "SecurePatrol"}
      </p>
    </header>
  );
}
