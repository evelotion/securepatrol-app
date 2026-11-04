import { Suspense } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { diffAudit } from "@/lib/audit-diff";
import { AUDIT_PER_HALAMAN, listAudit } from "@/lib/data-audit";
import { formatDateTime } from "@/lib/format";
import { isTanggalValid } from "@/lib/rentang";

export const metadata = { title: "Audit Log" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function satu(nilai: string | string[] | undefined): string {
  return (Array.isArray(nilai) ? nilai[0] : nilai)?.trim() ?? "";
}

export default function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-[var(--radius)]" />}>
      <AuditSection searchParams={searchParams} />
    </Suspense>
  );
}

async function AuditSection({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const dari = satu(sp.dari);
  const sampai = satu(sp.sampai);
  const halaman = Math.max(1, Math.floor(Number(satu(sp.halaman))) || 1);

  const filter = {
    aksi: satu(sp.aksi),
    tabel: satu(sp.tabel),
    user: satu(sp.user),
    dari: isTanggalValid(dari) ? dari : null,
    sampai: isTanggalValid(sampai) ? sampai : null,
    halaman,
  };

  const { rows, total, tabelOpsi } = await listAudit(filter);
  const totalHalaman = Math.max(1, Math.ceil(total / AUDIT_PER_HALAMAN));

  const query = (h: number) => {
    const p = new URLSearchParams();
    if (filter.aksi) p.set("aksi", filter.aksi);
    if (filter.tabel) p.set("tabel", filter.tabel);
    if (filter.user) p.set("user", filter.user);
    if (filter.dari) p.set("dari", filter.dari);
    if (filter.sampai) p.set("sampai", filter.sampai);
    p.set("halaman", String(h));
    return `/master/audit?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">Super Admin</p>
        <h1 className="page-title mt-1">Audit Log</h1>
        <p className="page-sub mt-0.5">
          Semua perubahan data. {total} entri ditemukan.
        </p>
      </header>

      <Card className="p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="field">
            <label className="field-label" htmlFor="f-aksi">Aksi</label>
            <Input id="f-aksi" name="aksi" defaultValue={filter.aksi} placeholder="mis. LOGIN" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="f-tabel">Tabel</label>
            <Select id="f-tabel" name="tabel" defaultValue={filter.tabel}>
              <option value="">Semua</option>
              {tabelOpsi.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="f-user">User</label>
            <Input id="f-user" name="user" defaultValue={filter.user} placeholder="nama / email" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="f-dari">Dari</label>
            <Input id="f-dari" name="dari" type="date" defaultValue={filter.dari ?? ""} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="f-sampai">Sampai</label>
            <Input id="f-sampai" name="sampai" type="date" defaultValue={filter.sampai ?? ""} />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
            <Button type="submit">Terapkan</Button>
            <Button asChild variant="outline">
              <Link href="/master/audit">Reset</Link>
            </Button>
          </div>
        </form>
      </Card>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada entri untuk filter ini.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const diff = diffAudit(row.dataLama, row.dataBaru);
            return (
              <li key={row.id}>
                <details className="rounded-[var(--radius-sm)] border border-border bg-card p-3">
                  <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="mono-num text-xs text-muted-foreground">
                      {formatDateTime(row.waktu)}
                    </span>
                    <span className="badge badge-indigo">{row.aksi}</span>
                    <span className="text-xs text-muted-foreground">{row.tabel}</span>
                    <span className="text-xs text-foreground">{row.namaUser ?? "sistem"}</span>
                  </summary>

                  {diff.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Tidak ada rincian data.</p>
                  ) : (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="py-1 pr-3">Field</th>
                            <th className="py-1 pr-3">Lama</th>
                            <th className="py-1">Baru</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diff.map((d) => (
                            <tr key={d.field} className="border-t border-border align-top">
                              <td className="mono-num py-1 pr-3 font-semibold">{d.field}</td>
                              <td className="mono-num break-all py-1 pr-3 text-[var(--status-bad-text)]">
                                {d.lama ?? "—"}
                              </td>
                              <td className="mono-num break-all py-1 text-[var(--status-ok-text)]">
                                {d.baru ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </details>
              </li>
            );
          })}
        </ul>
      )}

      <nav aria-label="Halaman" className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" className={halaman <= 1 ? "pointer-events-none opacity-50" : ""}>
          <Link href={query(halaman - 1)} aria-disabled={halaman <= 1}>Sebelumnya</Link>
        </Button>
        <span className="text-sm text-muted-foreground">
          Halaman {halaman} / {totalHalaman}
        </span>
        <Button asChild variant="outline" className={halaman >= totalHalaman ? "pointer-events-none opacity-50" : ""}>
          <Link href={query(halaman + 1)} aria-disabled={halaman >= totalHalaman}>Berikutnya</Link>
        </Button>
      </nav>
    </div>
  );
}
