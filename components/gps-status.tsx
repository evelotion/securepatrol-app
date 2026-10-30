"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { toneAkurasi, type Tone } from "@/lib/ui";
import type { GeolocationState } from "@/lib/use-geolocation";

const TONE_TEXT: Record<Tone, string> = {
  ok: "text-[var(--status-ok-text)]",
  warn: "text-[var(--status-warn-text)]",
  bad: "text-[var(--status-bad-text)]",
  neutral: "text-muted-foreground",
};

/** Indikator GPS: akurasi dalam meter dengan warna status + koordinat. */
export function GpsStatus({
  gps,
  koordinat,
}: {
  gps: GeolocationState;
  koordinat: string | null;
}) {
  const akurasi = gps.posisi?.accuracy ?? null;
  const tone: Tone = gps.error ? "bad" : toneAkurasi(akurasi);
  const Ikon =
    tone === "ok"
      ? CheckCircle2
      : tone === "bad"
        ? AlertCircle
        : AlertTriangle;

  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-card p-3">
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 shrink-0 ${TONE_TEXT[tone]}`}>
          <Ikon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${TONE_TEXT[tone]}`}>
            {gps.loading
              ? "Mengambil lokasi GPS…"
              : gps.error
                ? "GPS bermasalah"
                : akurasi === null
                  ? "Menunggu lokasi GPS"
                  : tone === "ok"
                    ? `GPS baik · ±${Math.round(akurasi)} m`
                    : tone === "warn"
                      ? `GPS sedang · ±${Math.round(akurasi)} m`
                      : `GPS buruk · ±${Math.round(akurasi)} m`}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{koordinat ?? "Belum ada koordinat"}</span>
          </p>
          {gps.error ? <p className="field-error mt-1">{gps.error}</p> : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={gps.refresh}
          disabled={gps.loading}
          aria-label="Perbarui lokasi GPS"
        >
          <RefreshCw
            className={`size-4 ${gps.loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
        </Button>
      </div>
    </div>
  );
}
