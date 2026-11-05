import { Suspense } from "react";

import { UserRound } from "lucide-react";

import { ThemeIkutSistem, ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { logoutSemuaPerangkat } from "@/app/actions/akun";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getSesiAktif } from "@/lib/data-akun";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/roles";

import { LogoutButton } from "../logout-button";
import { GantiPasswordForm } from "./ganti-password-form";

export const metadata = { title: "Profil" };

/** Tab Profil: identitas, tema, ganti password, sesi aktif, dan keluar (F4-8). */
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
  // Halaman ini satu-satunya yang boleh dibuka saat wajib ganti password.
  const user = await getCurrentUser({ izinkanGantiPassword: true });
  const sesi = await getSesiAktif(user.id);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">Akun</p>
        <h1 className="page-title mt-1">Profil</h1>
      </header>

      {user.harusGantiPassword ? (
        <p role="alert" className="alert-warn">
          Demi keamanan, ganti password awal dari admin sebelum memakai
          aplikasi.
        </p>
      ) : null}

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
        <h2 className="section-title">Ganti password</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Setelah diganti, perangkat lain otomatis keluar.
        </p>
        <GantiPasswordForm />
      </Card>

      <Card className="p-5">
        <h2 className="section-title">Sesi aktif</h2>
        <ul className="mt-3 divide-y divide-border">
          {sesi.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Login {formatDateTime(item.dibuatPada)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Berlaku sampai {formatDateTime(item.berakhirPada)}
                </p>
              </div>
              {item.saatIni ? (
                <span className="badge badge-green shrink-0">Perangkat ini</span>
              ) : null}
            </li>
          ))}
        </ul>
        <form action={logoutSemuaPerangkat} className="mt-4">
          <Button type="submit" variant="outline" className="w-full">
            Keluar dari semua perangkat
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="section-title">Keluar</h2>
        <LogoutButton />
      </Card>
    </div>
  );
}
