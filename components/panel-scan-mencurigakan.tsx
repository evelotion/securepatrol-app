import Link from "next/link";

import { ShieldAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { ScanMencurigakan } from "@/lib/data-mencurigakan";
import { formatDateTime } from "@/lib/format";

/**
 * Panel "Scan mencurigakan" untuk Danru/Chief (anti titik palsu). Tiap
 * petugas dapat dibuka untuk melihat scan terbarunya; tiap scan menaut ke
 * halaman detail beserta foto bukti.
 */
export function PanelScanMencurigakan({
  data,
  keterangan,
}: {
  data: ScanMencurigakan;
  /** Mis. "7 hari terakhir" atau rentang laporan. */
  keterangan: string;
}) {
  const total = data.petugas.reduce((s, p) => s + p.tidakValid, 0);
  const cepat = data.petugas.reduce((s, p) => s + p.terlaluCepat, 0);

  return (
    <Card className="p-4" aria-label="Scan mencurigakan">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <ShieldAlert className="size-4 text-[var(--status-bad-text)]" aria-hidden="true" />
            Scan mencurigakan
          </h2>
          <p className="text-xs text-muted-foreground">
            Scan tidak valid per petugas, {keterangan}. “Terlalu cepat” = jeda
            dari titik sebelumnya lebih singkat dari batas waktu tempuh.
          </p>
        </div>
        <span
          className={`badge shrink-0 ${total > 0 ? "badge-red" : "badge-green"}`}
        >
          {total} tidak valid · {cepat} terlalu cepat
        </span>
      </div>

      {data.petugas.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Tidak ada scan mencurigakan pada periode ini.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {data.petugas.map((p) => (
            <li
              key={p.userId}
              className="rounded-[var(--radius-sm)] border border-border"
            >
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <span className="min-w-0">
                    <span className="text-sm font-semibold text-foreground">
                      {p.nama}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {p.regu ?? "Tanpa regu"}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-1.5">
                    <span
                      className={`badge ${p.terlaluCepat > 0 ? "badge-red" : "badge-slate"}`}
                    >
                      {p.terlaluCepat} terlalu cepat
                    </span>
                    <span className="badge badge-amber">
                      {p.tidakValid} tidak valid
                    </span>
                  </span>
                </summary>

                <ul className="divide-y divide-border border-t border-border">
                  {p.scan.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="mono-num text-xs text-muted-foreground">
                          {formatDateTime(s.waktu)}
                        </span>{" "}
                        <span className="font-medium">{s.namaTitik}</span>
                        <span
                          className={`block text-xs ${
                            s.terlaluCepat
                              ? "font-semibold text-[var(--status-bad-text)]"
                              : "text-muted-foreground"
                          }`}
                        >
                          {s.alasan}
                        </span>
                      </span>
                      <Link
                        href={`/detail/patroli/${s.id}`}
                        className="shrink-0 text-xs font-semibold text-primary hover:underline"
                      >
                        Detail & foto
                      </Link>
                    </li>
                  ))}
                  {p.tidakValid > p.scan.length ? (
                    <li className="px-3 py-2 text-xs text-muted-foreground">
                      +{p.tidakValid - p.scan.length} scan lain pada periode ini.
                    </li>
                  ) : null}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      )}
      {data.terpotong ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Menampilkan {2000} scan terbaru; persempit periode untuk hasil lengkap.
        </p>
      ) : null}
    </Card>
  );
}
