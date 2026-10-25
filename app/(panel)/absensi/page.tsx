import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { formatJam, formatTanggal } from "@/lib/format";
import { getAbsensiSaya } from "@/lib/data";

import { AbsensiClient } from "./absensi-client";

export const metadata = { title: "Absensi" };

export default function AbsensiPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      }
    >
      <AbsensiSection />
    </Suspense>
  );
}

async function AbsensiSection() {
  const { actor, absensi } = await getAbsensiSaya();
  const hariIni = new Date();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Absensi Kehadiran</h1>
          <p className="page-sub mt-1">
            {formatTanggal(hariIni)} · {actor.nama}
            {actor.regu ? ` · ${actor.regu}` : ""}
          </p>
        </div>
        <span
          className={`badge ${absensi ? "badge-green" : "badge-amber"}`}
        >
          {absensi
            ? absensi.waktuKeluar
              ? "Selesai hari ini"
              : `Masuk ${formatJam(absensi.waktuMasuk)}`
            : "Belum absen masuk"}
        </span>
      </header>

      <AbsensiClient absensi={absensi} />
    </div>
  );
}
