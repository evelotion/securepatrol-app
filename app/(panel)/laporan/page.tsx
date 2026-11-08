import { Suspense } from "react";

import Link from "next/link";

import { ExportExcel } from "@/components/export-excel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { bacaFilterLaporan, getLaporan } from "@/lib/data-laporan";
import { thumbnailDiizinkan } from "@/lib/excel-baris";
import { formatTanggal } from "@/lib/format";

export const metadata = { title: "Laporan" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function LaporanPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-[var(--radius)]" />}>
      <LaporanSection searchParams={searchParams} />
    </Suspense>
  );
}

async function LaporanSection({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const nilai = Array.isArray(v) ? v[0] : v;
    if (nilai) params.set(k, nilai);
  }

  const filter = bacaFilterLaporan(params);
  const laporan = await getLaporan(filter);
  const { ringkasan: r } = laporan;

  const exportQuery = new URLSearchParams({ dari: filter.dari, sampai: filter.sampai });
  if (filter.regu) exportQuery.set("regu", filter.regu);
  if (filter.userId) exportQuery.set("user", filter.userId);

  const kpi = [
    { label: "Hadir", nilai: r.hadir, hint: `${r.personel} personel` },
    { label: "Telat", nilai: r.telat, hint: "kali" },
    { label: "Tidak hadir", nilai: r.tidakHadir, hint: "kali" },
    { label: "Titik terpatroli", nilai: `${r.persenTitikTerpatroli}%`, hint: `dari ${laporan.totalTitikAktif} titik` },
    { label: "Scan tidak valid", nilai: r.tidakValid, hint: `dari ${r.scan} scan` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">
            {formatTanggal(`${filter.dari}T00:00:00+07:00`)} –{" "}
            {formatTanggal(`${filter.sampai}T00:00:00+07:00`)}
          </p>
          <h1 className="page-title mt-1">Laporan</h1>
          <p className="page-sub mt-0.5">
            Rekap kehadiran dan patroli{" "}
            {laporan.actor.role === "DANRU" && laporan.actor.regu
              ? laporan.actor.regu
              : "semua regu"}
            .
          </p>
        </div>
        <ExportExcel
          query={exportQuery.toString()}
          bolehThumbnail={thumbnailDiizinkan(filter.dari, filter.sampai)}
        />
      </header>

      <Card className="p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="field">
            <label className="field-label" htmlFor="l-dari">Dari</label>
            <Input id="l-dari" name="dari" type="date" defaultValue={filter.dari} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="l-sampai">Sampai</label>
            <Input id="l-sampai" name="sampai" type="date" defaultValue={filter.sampai} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="l-regu">Regu</label>
            <Select id="l-regu" name="regu" defaultValue={filter.regu}>
              <option value="">Semua</option>
              {laporan.opsiRegu.map((regu) => (
                <option key={regu} value={regu}>{regu}</option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="l-user">Personel</label>
            <Select id="l-user" name="user" defaultValue={filter.userId}>
              <option value="">Semua</option>
              {laporan.opsiUser.map((u) => (
                <option key={u.id} value={u.id}>{u.nama}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit">Terapkan</Button>
            <Button asChild variant="outline">
              <Link href="/laporan">Reset</Link>
            </Button>
          </div>
        </form>
        {filter.error ? (
          <p role="alert" className="alert-warn mt-3">
            {filter.error} Menampilkan 7 hari terakhir.
          </p>
        ) : null}
      </Card>

      <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpi.map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p className="stat-value mt-2">{item.nilai}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
          </Card>
        ))}
      </section>

      <Card className="p-4">
        <h2 className="section-title">Kehadiran per personel</h2>
        {laporan.kehadiran.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Tidak ada personel untuk filter ini.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Nama</th>
                  <th className="py-2 pr-3">Regu</th>
                  <th className="py-2 pr-3 text-right">Hadir</th>
                  <th className="py-2 pr-3 text-right">Telat</th>
                  <th className="py-2 pr-3 text-right">Pulang cepat</th>
                  <th className="py-2 text-right">Tidak hadir</th>
                </tr>
              </thead>
              <tbody>
                {laporan.kehadiran.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2 pr-3 font-medium">{row.nama}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.regu ?? "—"}</td>
                    <td className="mono-num py-2 pr-3 text-right">{row.hadir}</td>
                    <td className="mono-num py-2 pr-3 text-right">{row.telat}</td>
                    <td className="mono-num py-2 pr-3 text-right">{row.pulangCepat}</td>
                    <td
                      className={`mono-num py-2 text-right ${
                        row.tidakHadir > 0 ? "font-semibold text-[var(--status-bad-text)]" : ""
                      }`}
                    >
                      {row.tidakHadir}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="section-title">Patroli per personel</h2>
        {laporan.patroli.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Tidak ada data patroli.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Nama</th>
                  <th className="py-2 pr-3">Regu</th>
                  <th className="py-2 pr-3 text-right">Scan</th>
                  <th className="py-2 pr-3 text-right">Tidak valid</th>
                  <th className="py-2 pr-3 text-right">Belum verif.</th>
                  <th className="py-2 text-right">Titik terpatroli</th>
                </tr>
              </thead>
              <tbody>
                {laporan.patroli.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2 pr-3 font-medium">{row.nama}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.regu ?? "—"}</td>
                    <td className="mono-num py-2 pr-3 text-right">{row.scan}</td>
                    <td
                      className={`mono-num py-2 pr-3 text-right ${
                        row.tidakValid > 0 ? "font-semibold text-[var(--status-bad-text)]" : ""
                      }`}
                    >
                      {row.tidakValid}
                    </td>
                    <td className="mono-num py-2 pr-3 text-right">{row.belumTerverifikasi}</td>
                    <td className="mono-num py-2 text-right">
                      {row.titikUnik}/{laporan.totalTitikAktif} ({row.persenTitik}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
