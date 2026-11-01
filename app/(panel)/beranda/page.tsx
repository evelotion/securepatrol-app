import { Suspense } from "react";

import Link from "next/link";

import {
  ArrowRight,
  Camera,
  LogIn,
  LogOut,
  ScanLine,
} from "lucide-react";

import { JamBerjalan } from "@/components/jam-berjalan";
import { StatusScanBadge } from "@/components/status-scan";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getAbsensiSaya, getPatroliSaya } from "@/lib/data";
import { formatJam, formatTanggal } from "@/lib/format";
import { jamWIB } from "@/lib/waktu";
import { persenProgres, shiftDariJam } from "@/lib/ui";

export const metadata = { title: "Beranda" };

export default function BerandaPage() {
  return (
    <Suspense fallback={<BerandaSkeleton />}>
      <Beranda />
    </Suspense>
  );
}

function BerandaSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-56 rounded-[var(--radius)]" />
      <Skeleton className="h-16 rounded-[var(--radius)]" />
      <Skeleton className="h-36 rounded-[var(--radius)]" />
    </div>
  );
}

async function Beranda() {
  const [{ actor, absensi }, { data }] = await Promise.all([
    getAbsensiSaya(),
    getPatroliSaya(),
  ]);

  const total = data.checkpoints.length;
  const dikunjungi = data.checkpoints.filter((cp) => cp.dikunjungi).length;
  const persen = persenProgres(dikunjungi, total);
  const sekarangIso = new Date().toISOString();
  const logTerakhir = data.logs.slice(0, 3);

  const shift = absensi
    ? shiftDariJam(Number(jamWIB(new Date(absensi.waktuMasuk)).slice(0, 2)))
    : null;
  const sedangBertugas = absensi !== null && absensi.waktuKeluar === null;
  const selesai = absensi !== null && absensi.waktuKeluar !== null;

  const aksi = !absensi
    ? { href: "/absensi", label: "Absen Masuk", icon: Camera }
    : sedangBertugas
      ? total > 0 && dikunjungi === total
        ? { href: "/absensi", label: "Absen Keluar", icon: LogOut }
        : { href: "/patroli", label: "Mulai Patroli", icon: ScanLine }
      : null;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">{formatTanggal(new Date(sekarangIso))}</p>
        <h1 className="page-title mt-1">Halo, {actor.nama.split(" ")[0]}</h1>
      </header>

      {/* Kartu status shift + jam berjalan */}
      <Card className="overflow-hidden p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Status shift</p>
            <p className="mt-1 text-lg font-semibold leading-snug text-foreground">
              {!absensi
                ? "Belum absen masuk"
                : sedangBertugas
                  ? `Bertugas sejak ${formatJam(absensi.waktuMasuk)}`
                  : "Shift selesai"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {!absensi
                ? "Ambil selfie untuk memulai shift."
                : selesai
                  ? `Masuk ${formatJam(absensi.waktuMasuk)} · Keluar ${formatJam(absensi.waktuKeluar ?? "")}`
                  : shift}
            </p>
          </div>
          <span
            className={`badge shrink-0 ${
              sedangBertugas
                ? "badge-green"
                : !absensi
                  ? "badge-amber"
                  : "badge-slate"
            }`}
          >
            {sedangBertugas ? "Aktif" : !absensi ? "Belum absen" : "Selesai"}
          </span>
        </div>

        <JamBerjalan
          iso={sekarangIso}
          className="mono-num mt-5 block text-5xl font-semibold tracking-tight text-foreground"
        />
        <p className="mt-1 text-xs text-muted-foreground">Waktu Indonesia Barat</p>
      </Card>

      {/* Tombol aksi utama — berubah mengikuti konteks shift */}
      {aksi ? (
        <Button asChild size="lg" className="w-full">
          <Link href={aksi.href}>
            <aksi.icon className="size-5" aria-hidden="true" />
            {aksi.label}
            <ArrowRight className="ml-auto size-5" aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button asChild size="lg" variant="outline" className="w-full">
          <Link href="/absensi">
            <Camera className="size-5" aria-hidden="true" />
            Lihat bukti absensi hari ini
          </Link>
        </Button>
      )}

      {sedangBertugas ? (
        <Button asChild variant="outline" className="w-full">
          <Link
            href={aksi?.href === "/absensi" ? "/patroli" : "/absensi"}
          >
            {aksi?.href === "/absensi" ? (
              <>
                <ScanLine className="size-4" aria-hidden="true" />
                Patroli lagi
              </>
            ) : (
              <>
                <LogIn className="size-4" aria-hidden="true" />
                Absen Keluar
              </>
            )}
          </Link>
        </Button>
      ) : null}

      {/* Progres patroli + ring */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">Progres patroli</h2>
          <Link
            href="/patroli"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Lihat rute
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-5">
          <div className="relative size-24 shrink-0">
            <svg viewBox="0 0 80 80" className="size-24 -rotate-90" aria-hidden="true">
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="var(--border)"
                strokeWidth="8"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke={persen === 100 ? "var(--status-ok)" : "var(--primary)"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={(2 * Math.PI * 34 * (100 - persen)) / 100}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="mono-num text-lg font-bold text-foreground">
                {dikunjungi}/{total}
              </span>
              <span className="text-[0.65rem] font-semibold text-muted-foreground">
                titik
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {total === 0
                ? "Belum ada titik patroli aktif"
                : persen === 100
                  ? "Semua titik sudah dipatroli"
                  : `${persen}% rute selesai`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {total === 0
                ? "Hubungi Danru/Super Admin untuk memetakan titik."
                : dikunjungi === total
                  ? "Anda bisa absen keluar setelah shift selesai."
                  : `Sisa ${total - dikunjungi} titik belum dikunjungi hari ini.`}
            </p>
          </div>
        </div>
      </Card>

      {logTerakhir.length > 0 ? (
        <Card className="p-5">
          <h2 className="section-title">Kunjungan terakhir</h2>
          <ul className="mt-3 divide-y divide-border">
            {logTerakhir.map((log) => (
              <li
                key={log.id}
                className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {log.namaCheckpoint}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatJam(log.waktu)}
                    {log.jarakM !== null ? ` · ${log.jarakM} m dari titik` : ""}
                  </p>
                </div>
                <StatusScanBadge status={log.status} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
