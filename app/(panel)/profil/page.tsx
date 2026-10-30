import { Suspense } from "react";

import { UserRound } from "lucide-react";

import { ThemeIkutSistem, ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/roles";

import { LogoutButton } from "../logout-button";

export const metadata = { title: "Profil" };

/**
 * Tab Profil. Ganti password & daftar sesi aktif (F4-8) menyusul;
 * untuk sekarang berisi identitas, tema, dan keluar.
 */
export default function ProfilPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-40 rounded-[var(--radius)]" />
          <Skeleton className="h-40 rounded-[var(--radius)]" />
        </div>
      }
    >
      <ProfilSection />
    </Suspense>
  );
}

async function ProfilSection() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">Akun</p>
        <h1 className="page-title mt-1">Profil</h1>
      </header>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <UserRound className="size-7" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground">
              {user.nama}
            </p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
          <div>
            <dt className="eyebrow">Role</dt>
            <dd className="mt-0.5 font-semibold text-foreground">
              {ROLE_LABEL[user.role]}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Regu</dt>
            <dd className="mt-0.5 font-semibold text-foreground">
              {user.regu ?? "—"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="section-title">Tampilan</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Mode gelap membantu di lorong minim cahaya. Tanpa pilihan manual,
          aplikasi mengikuti pengaturan sistem.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ThemeToggle className="tap size-12 border border-border bg-card" />
          <ThemeIkutSistem />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="section-title">Keamanan akun</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ganti password dan kelola sesi aktif akan tersedia di rilis berikutnya.
        </p>
        <LogoutButton />
      </Card>
    </div>
  );
}
