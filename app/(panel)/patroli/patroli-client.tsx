"use client";

import { useActionState, useState } from "react";

import { CheckCircle2, MapPin, ScanLine } from "lucide-react";

import { catatPatroli } from "@/app/actions/patroli";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { CameraCapture } from "@/components/camera-capture";
import { GpsStatus } from "@/components/gps-status";
import { StatusScanBadge } from "@/components/status-scan";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/form";
import { formatJam } from "@/lib/format";
import { haversineMeters } from "@/lib/geo";
import type { CheckpointProgress, PatroliLogRow } from "@/lib/types";
import { useGeolocation, type Posisi } from "@/lib/use-geolocation";

/**
 * Blok 5 — form kunjungan patroli: scan barcode + foto bukti + GPS,
 * dikirim ke Server Action `catatPatroli` yang memvalidasi jarak.
 */
export function PatroliClient({
  checkpoints,
  logs,
  actorName,
}: {
  checkpoints: CheckpointProgress[];
  logs: PatroliLogRow[];
  actorName: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    catatPatroli,
    undefined,
  );

  const [kode, setKode] = useState<string>("");
  const [foto, setFoto] = useState<string | null>(null);
  const gps = useGeolocation();

  // Setelah kunjungan tercatat, bersihkan input untuk scan berikutnya.
  // Pola "simpan state render sebelumnya" (react.dev You Might Not Need an Effect).
  const [prevState, setPrevState] = useState<FormState>(undefined);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.ok) {
      setKode("");
      setFoto(null);
    }
  }

  const koordinat = gps.posisi
    ? `${gps.posisi.lat.toFixed(6)}, ${gps.posisi.long.toFixed(6)}`
    : null;

  const titik = kode
    ? checkpoints.find((cp) => cp.kodeBarcode === kode) ?? null
    : null;
  const jarak =
    titik && titik.lat && titik.long && gps.posisi
      ? haversineMeters(gps.posisi, {
          lat: Number(titik.lat),
          long: Number(titik.long),
        })
      : null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="section-title">Scan Titik</h2>
            <p className="text-xs text-muted-foreground">
              Arahkan kamera ke barcode titik patroli.
            </p>
          </div>
          <span
            className={`badge shrink-0 ${
              kode ? "badge-green" : "badge-slate"
            }`}
          >
            {kode ? "Terbaca" : "Menunggu"}
          </span>
        </div>

        <div className="flex flex-col gap-4 p-4">
          {state?.message ? (
            <p role="status" className="alert-success">
              {state.message}
            </p>
          ) : null}
          {state?.errors
            ? Object.values(state.errors).map((pesan) => (
                <p key={pesan} role="alert" className="alert-error">
                  {pesan}
                </p>
              ))
            : null}
          {state?.warning ? (
            <p role="status" className="alert-warn">
              {state.warning}
            </p>
          ) : null}

          <BarcodeScanner onScan={setKode} disabled={pending} />

          <form action={formAction} className="flex flex-col gap-4">
            <div className="field">
              <label className="field-label" htmlFor="kode">
                Kode Barcode
              </label>
              <Input
                id="kode"
                name="kode"
                type="text"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                placeholder="Hasil scan otomatis terisi di sini"
                autoComplete="off"
                className="mono-num"
              />
            </div>

            {kode ? (
              <div className="rounded-[var(--radius-sm)] border border-border bg-card p-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary">
                    <MapPin className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {titik ? titik.namaTitik : "Titik belum dikenal"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {jarak !== null
                        ? `${Math.round(jarak)} m dari posisi Anda`
                        : titik
                          ? "Jarak belum bisa dihitung — menunggu GPS."
                          : "Periksa kode atau hubungi Danru."}
                    </p>
                  </div>
                  {titik?.dikunjungi ? (
                    <span className="badge badge-green shrink-0">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      Sudah
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {kode ? (
              <>
                <CameraCapture
                  value={foto}
                  onChange={setFoto}
                  watermark={patrolWatermark(gps.posisi, actorName)}
                  label="Foto Area"
                  facing="environment"
                  hero
                  hint="Ambil foto kondisi sekitar titik patroli."
                />

                <GpsStatus gps={gps} koordinat={koordinat} />

                <input type="hidden" name="foto" value={foto ?? ""} />
                <input
                  type="hidden"
                  name="lat"
                  value={gps.posisi ? String(gps.posisi.lat) : ""}
                />
                <input
                  type="hidden"
                  name="long"
                  value={gps.posisi ? String(gps.posisi.long) : ""}
                />
                <input
                  type="hidden"
                  name="accuracy"
                  value={
                    gps.posisi?.accuracy === null || !gps.posisi
                      ? ""
                      : String(gps.posisi.accuracy)
                  }
                />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={pending || kode === "" || foto === null}
                >
                  <ScanLine className="size-5" aria-hidden="true" />
                  {pending
                    ? "Menyimpan…"
                    : foto === null
                      ? "Ambil foto area dulu"
                      : "Catat Kunjungan"}
                </Button>
              </>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Pindai barcode untuk membuka foto area dan tombol simpan.
              </p>
            )}
          </form>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">Rute Hari Ini</h2>
          <span className="badge badge-indigo shrink-0">
            {checkpoints.filter((cp) => cp.dikunjungi).length}/
            {checkpoints.length} titik
          </span>
        </div>

        <ol className="mt-3 flex flex-col gap-2">
          {checkpoints.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              Belum ada titik patroli aktif. Hubungi SUPER_ADMIN.
            </li>
          ) : (
            checkpoints.map((cp, index) => (
              <li
                key={cp.id}
                className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-border px-3 py-2.5"
              >
                <span
                  className={`mono-num mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    cp.dikunjungi
                      ? "bg-[color-mix(in_oklab,var(--status-ok)_16%,transparent)] text-[var(--status-ok-text)]"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {cp.namaTitik}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {cp.dikunjungi
                      ? `${cp.pengunjung ?? "Anda"} · ${
                          cp.kunjunganTerakhir
                            ? formatJam(cp.kunjunganTerakhir)
                            : ""
                        }`
                      : cp.kodeBarcode}
                  </p>
                  {cp.alasanTerakhir ? (
                    <p className="mt-0.5 text-xs font-medium text-[var(--status-warn-text)]">
                      {cp.alasanTerakhir}
                    </p>
                  ) : null}
                </div>
                <StatusScanBadge status={cp.statusTerakhir} />
              </li>
            ))
          )}
        </ol>
      </Card>

      {logs.length > 0 ? (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Kunjungan Hari Ini</h2>
            <span className="badge badge-slate shrink-0">
              {logs.length} log
            </span>
          </div>
          <ul className="mt-2 divide-y divide-border">
            {logs.slice(0, 5).map((log) => (
              <li
                key={log.id}
                className="flex items-start justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {log.namaCheckpoint}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatJam(log.waktu)}
                    {log.jarakM !== null ? ` · ${log.jarakM} m` : ""}
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

function patrolWatermark(
  position: Posisi | null,
  actorName: string,
): string {
  const location = position
    ? `${position.lat.toFixed(6)}, ${position.long.toFixed(6)}`
    : "Lokasi GPS tidak tersedia";
  return `${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}\n${location}\n${actorName}`;
}
