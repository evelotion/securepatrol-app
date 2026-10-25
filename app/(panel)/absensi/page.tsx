import { Suspense } from "react";

import { formatJam, formatTanggal } from "@/lib/format";
import { getAbsensiSaya } from "@/lib/data";

import { AbsensiClient } from "./absensi-client";

export const metadata = { title: "Absensi" };

export default function AbsensiPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <div className="skeleton h-24 w-full rounded-2xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="skeleton h-96 w-full rounded-2xl" />
            <div className="skeleton h-96 w-full rounded-2xl" />
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
    <div className="flex flex-col gap-5">
      <header className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
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
        </div>
      </header>

      <AbsensiClient absensi={absensi} />
    </div>
  );
}
