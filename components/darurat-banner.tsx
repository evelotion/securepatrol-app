import { Siren } from "lucide-react";

import { TombolTangani } from "@/components/insiden-kartu";
import { formatJam } from "@/lib/format";
import { tautanPeta } from "@/lib/insiden";
import type { InsidenRow } from "@/lib/types";

/**
 * Banner merah sinyal darurat yang belum ditangani. Tetap tampil sampai ada
 * manager yang menekan "Saya tangani". Penyegaran berkala dilakukan oleh
 * <AutoRefresh /> pada halaman pemanggil.
 */
export function DaruratBanner({ daftar }: { daftar: InsidenRow[] }) {
  if (daftar.length === 0) return null;

  return (
    <section
      role="alert"
      aria-label="Sinyal darurat aktif"
      className="flex flex-col gap-3 rounded-[var(--radius)] border-2 border-[var(--status-bad)] bg-[color-mix(in_oklab,var(--status-bad)_12%,var(--card))] p-4"
    >
      <h2 className="flex items-center gap-2 text-base font-bold text-[var(--status-bad-text)]">
        <Siren className="size-5" aria-hidden="true" />
        DARURAT — {daftar.length} sinyal belum ditangani
      </h2>

      <ul className="flex flex-col gap-3">
        {daftar.map((item) => {
          const peta = tautanPeta(item.lat, item.long);
          return (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-[var(--radius-sm)] bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {item.namaPelapor}
                  {item.reguPelapor ? ` · ${item.reguPelapor}` : ""}
                </p>
                <p className="mono-num text-xs text-muted-foreground">
                  Sejak {formatJam(item.dibuatPada)} WIB
                  {peta ? null : " · lokasi tidak tersedia"}
                </p>
                {peta ? (
                  <a
                    href={peta}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Buka lokasi di peta
                  </a>
                ) : null}
              </div>
              <div className="sm:w-48">
                <TombolTangani id={item.id} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
