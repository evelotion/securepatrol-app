import { Suspense } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatJam } from "@/lib/format";

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

async function Dashboard() {
  const { actor, scope, data, stats } = await getDashboardHariIni();
  const { summary, absensi, checkpoints, logs } = data;
  const isTim = scope === "tim";

  const cards = [
    {
      label: "Hadir hari ini",
      value: summary.totalHadir,
      hint: "staf terabsen",
    },
    {
      label: "Sedang bertugas",
      value: summary.sedangBertugas,
      hint: "belum absen keluar",
    },
    {
      label: "Sudah pulang",
      value: summary.sudahPulang,
      hint: "absen keluar",
    },
    {
      label: "Titik terpatroli",
      value: `${summary.checkpointTerpatroli}/${summary.totalCheckpointAktif}`,
      hint: "checkpoint hari ini",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Selamat datang, {actor.nama}</h1>
          <p className="page-sub mt-1">
            {isTim
              ? "Ringkasan kehadiran & patroli tim hari ini."
              : "Ringkasan kehadiran & patroli Anda hari ini."}
          </p>
        </div>
        <span className="badge badge-slate">
          {summary.logHariIni} kunjungan · {summary.logValid} valid
          {summary.logInvalid > 0 ? ` · ${summary.logInvalid} invalid` : ""}
        </span>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-4 sm:p-5">
            <p className="text-xs font-medium text-muted-foreground">
              {card.label}
            </p>
            <p className="stat-value mt-2">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </Card>
        ))}
      </section>

      {isTim && absensi.length > 0 ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base">Status absensi tim</CardTitle>
            <span className="badge badge-indigo">{absensi.length} orang</span>
          </CardHeader>
          <CardContent>
            <Table className="min-w-[36rem]">
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
                    <TableCell>{row.regu ?? "-"}</TableCell>
                    <TableCell>{formatJam(row.waktuMasuk)}</TableCell>
                    <TableCell>
                      {row.waktuKeluar ? formatJam(row.waktuKeluar) : "-"}
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
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base">Progres patroli</CardTitle>
            <span className="badge badge-amber">
              {summary.checkpointTerpatroli}/{summary.totalCheckpointAktif}
            </span>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {checkpoints.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  Belum ada titik patroli aktif.
                </li>
              ) : (
                checkpoints.map((cp) => (
                  <li
                    key={cp.id}
                    className="glass-inset flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {cp.namaTitik}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {cp.dikunjungi
                          ? `${cp.pengunjung ?? "-"}${
                              cp.kunjunganTerakhir
                                ? ` · ${formatJam(cp.kunjunganTerakhir)}`
                                : ""
                            }${
                              cp.jumlahInvalid > 0
                                ? ` · ${cp.jumlahInvalid} invalid`
                                : ""
                            }`
                          : "Belum dikunjungi"}
                      </p>
                    </div>
                    <span
                      className={`badge shrink-0 ${
                        cp.dikunjungi ? "badge-green" : "badge-amber"
                      }`}
                    >
                      {cp.dikunjungi ? "Sudah" : "Belum"}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base">Kunjungan terbaru</CardTitle>
            <span className="badge badge-slate">{logs.length} log</span>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {logs.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  Belum ada kunjungan patroli hari ini.
                </li>
              ) : (
                logs.map((log) => (
                  <li
                    key={log.id}
                    className="glass-inset flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {log.namaCheckpoint}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatJam(log.waktu)} · {log.namaUser}
                      </p>
                    </div>
                    <span
                      className={`badge shrink-0 ${
                        log.statusValid ? "badge-green" : "badge-amber"
                      }`}
                    >
                      {log.statusValid ? "Valid" : "Invalid"}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </section>

      {actor.role === "SUPER_ADMIN" ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Kelola data master</CardTitle>
            {stats ? (
              <span className="badge badge-indigo">
                {stats.userAktif}/{stats.totalUser} user ·{" "}
                {stats.checkpointAktif}/{stats.totalCheckpoint} checkpoint
              </span>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild size="sm">
              <Link href="/master/users">Kelola User</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/master/checkpoints">Kelola Checkpoint</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
