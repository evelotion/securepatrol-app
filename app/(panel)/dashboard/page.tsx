import { Suspense } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Activity,
  ArrowRight,
  MapPinned,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import { StatusScanBadge } from "@/components/status-scan";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getDashboardHariIni } from "@/lib/data";
import { formatJam, formatTanggal } from "@/lib/format";
import { isManager } from "@/lib/roles";
import { startOfHariWIB } from "@/lib/waktu";
import { labelStatusScan, persenProgres, type Tone } from "@/lib/ui";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[var(--radius)]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-80 rounded-[var(--radius)] xl:col-span-2" />
        <Skeleton className="h-80 rounded-[var(--radius)]" />
      </div>
    </div>
  );
}

const TONE_BORDER: Record<Tone, string> = {
  ok: "border-l-[var(--status-ok)]",
  warn: "border-l-[var(--status-warn)]",
  bad: "border-l-[var(--status-bad)]",
  neutral: "border-l-[var(--muted-foreground)]",
};

const TONE_TEXT: Record<Tone, string> = {
  ok: "text-[var(--status-ok-text)]",
  warn: "text-[var(--status-warn-text)]",
  bad: "text-[var(--status-bad-text)]",
  neutral: "text-muted-foreground",
};

async function Dashboard() {
  const { actor, data } = await getDashboardHariIni();
  if (!isManager(actor.role)) redirect("/beranda");

  const { summary, absensi, checkpoints, logs } = data;
  const persen = persenProgres(
    summary.checkpointTerpatroli,
    summary.totalCheckpointAktif,
  );
  const hariIni = startOfHariWIB();

  const kpi = [
    {
      label: "Hadir",
      value: summary.totalHadir,
      hint: "staf terabsen hari ini",
      tone: "ok" as Tone,
      Ikon: UserCheck,
    },
    {
      label: "Bertugas",
      value: summary.sedangBertugas,
      hint: "belum absen keluar",
      tone: "neutral" as Tone,
      Ikon: ShieldCheck,
    },
    {
      label: "Titik terpatroli",
      value: `${persen}%`,
      hint: `${summary.checkpointTerpatroli}/${summary.totalCheckpointAktif} titik`,
      tone: persen === 100 ? ("ok" as Tone) : ("warn" as Tone),
      Ikon: MapPinned,
    },
    {
      label: "Scan tidak valid",
      value: summary.logInvalid,
      hint: `${summary.logBelumTerverifikasi} belum terverifikasi`,
      tone: summary.logInvalid > 0 ? ("bad" as Tone) : ("ok" as Tone),
      Ikon: ShieldAlert,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{formatTanggal(hariIni)} · WIB</p>
          <h1 className="page-title mt-1">Ruang kontrol</h1>
          <p className="page-sub mt-0.5">
            Kehadiran & patroli {actor.regu ? actor.regu : "semua regu"} hari
            ini.
          </p>
        </div>
        <span className="badge badge-slate shrink-0">
          {summary.logHariIni} kunjungan · {summary.logValid} valid
        </span>
      </header>

      <section
        aria-label="Ringkasan hari ini"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {kpi.map((item) => (
          <Card key={item.label} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <item.Ikon
                className={`size-4 shrink-0 ${TONE_TEXT[item.tone]}`}
                aria-hidden="true"
              />
            </div>
            <p className="stat-value mt-2">{item.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="section-title">Titik patroli</h2>
              <p className="text-xs text-muted-foreground">
                Warna menunjukkan status scan terakhir.
              </p>
            </div>
            <span className="badge badge-indigo">
              {summary.checkpointTerpatroli}/{summary.totalCheckpointAktif}{" "}
              terpatroli
            </span>
          </div>

          {checkpoints.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Belum ada titik patroli aktif.
            </p>
          ) : (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {checkpoints.map((cp) => {
                const { tone } = labelStatusScan(cp.statusTerakhir);
                const alasan = cp.alasanTerakhir;
                return (
                  <li
                    key={cp.id}
                    className={`rounded-[var(--radius-sm)] border border-l-4 border-border bg-card p-3 ${TONE_BORDER[tone]}`}
                  >
                    <p className="truncate text-sm font-semibold text-foreground">
                      {cp.namaTitik}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {cp.dikunjungi
                        ? `${cp.pengunjung ?? "-"} · ${
                            cp.kunjunganTerakhir
                              ? formatJam(cp.kunjunganTerakhir)
                              : ""
                          }`
                        : "Belum dikunjungi"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusScanBadge status={cp.statusTerakhir} />
                      {cp.jumlahTidakValid > 0 ? (
                        <span className="text-xs font-medium text-[var(--status-bad-text)]">
                          {cp.jumlahTidakValid} tidak valid
                        </span>
                      ) : null}
                    </div>
                    {alasan ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {alasan}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="section-title">Aktivitas</h2>
            <span className="badge badge-slate">terbaru</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Scan masuk terbaru hari ini.
          </p>

          {logs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Belum ada aktivitas patroli hari ini.
            </p>
          ) : (
            <ul className="mt-3 -mx-1 flex flex-col divide-y divide-border overflow-y-auto">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-start gap-2.5 px-1 py-2.5"
                >
                  <Activity
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {log.namaCheckpoint}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.namaUser} · {formatJam(log.waktu)}
                      {log.jarakM !== null ? ` · ${log.jarakM} m` : ""}
                    </p>
                    {log.alasan ? (
                      <p className="mt-0.5 text-xs text-[var(--status-warn-text)]">
                        {log.alasan}
                      </p>
                    ) : null}
                  </div>
                  <StatusScanBadge status={log.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="section-title">Personel hari ini</h2>
            <p className="text-xs text-muted-foreground">
              Absensi tim {actor.regu ?? "semua regu"}.
            </p>
          </div>
          <span className="badge badge-slate">
            <Users className="size-3.5" aria-hidden="true" />
            {absensi.length} orang
          </span>
        </div>

        {absensi.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Belum ada personel yang absen hari ini.
          </p>
        ) : (
          <>
            {/* HP: daftar kartu agar tidak ada scroll horizontal. */}
            <ul className="mt-4 flex flex-col gap-2 md:hidden">
              {absensi.map((row) => (
                <li
                  key={row.userId}
                  className="rounded-[var(--radius-sm)] border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {row.nama}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.regu ?? "—"}
                      </p>
                    </div>
                    <span
                      className={`badge shrink-0 ${
                        row.waktuKeluar ? "badge-slate" : "badge-green"
                      }`}
                    >
                      {row.waktuKeluar ? "Pulang" : "Bertugas"}
                    </span>
                  </div>
                  <p className="mono-num mt-2 text-xs text-muted-foreground">
                    Masuk {formatJam(row.waktuMasuk)}
                    {row.waktuKeluar
                      ? ` · Keluar ${formatJam(row.waktuKeluar)}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>

            {/* Desktop: tabel padat */}
            <div className="mt-4 hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Regu</TableHead>
                    <TableHead>Masuk</TableHead>
                    <TableHead>Keluar</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absensi.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell className="font-medium">{row.nama}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.regu ?? "—"}
                      </TableCell>
                      <TableCell className="mono-num">
                        {formatJam(row.waktuMasuk)}
                      </TableCell>
                      <TableCell className="mono-num">
                        {row.waktuKeluar ? formatJam(row.waktuKeluar) : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`badge ${
                            row.waktuKeluar ? "badge-slate" : "badge-green"
                          }`}
                        >
                          {row.waktuKeluar ? "Pulang" : "Bertugas"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {actor.role === "SUPER_ADMIN" ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">Data master</h2>
            <span className="badge badge-indigo">Super Admin</span>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/master/users">
                <Users className="size-4" aria-hidden="true" />
                Kelola User
                <ArrowRight className="ml-auto size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/master/checkpoints">
                <MapPinned className="size-4" aria-hidden="true" />
                Kelola Checkpoint
                <ArrowRight className="ml-auto size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
