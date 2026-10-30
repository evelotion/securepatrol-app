import { Suspense } from "react";

import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { formatJam, formatTanggal } from "@/lib/format";
import { getAbsensiSaya } from "@/lib/data";

import { AbsensiClient } from "./absensi-client";

export const metadata = { title: "Absensi" };

export default function AbsensiPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-24 rounded-[var(--radius)]" />
          <Skeleton className="h-64 rounded-[var(--radius)]" />
          <Skeleton className="h-20 rounded-[var(--radius)]" />
        </div>
      }
    >
      <AbsensiSection />
    </Suspense>
  );
}

async function AbsensiSection() {
  const { actor, absensi } = await getAbsensiSaya();

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start gap-1">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0"
          aria-label="Kembali ke Beranda"
        >
          <Link href="/beranda">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="page-title">Absensi</h1>
          <p className="page-sub mt-0.5 truncate">
            {formatTanggal(new Date())} · {actor.nama}
            {actor.regu ? ` · ${actor.regu}` : ""}
          </p>
        </div>
      </header>

      {absensi ? (
        <p className="text-sm text-muted-foreground">
          {absensi.waktuKeluar
            ? `Masuk ${formatJam(absensi.waktuMasuk)} · Keluar ${formatJam(absensi.waktuKeluar)}`
            : `Sedang bertugas sejak ${formatJam(absensi.waktuMasuk)}`}
        </p>
      ) : null}

      <AbsensiClient absensi={absensi} actorName={actor.nama} />
    </div>
  );
}
