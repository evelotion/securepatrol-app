"use client";

import { useActionState, useState } from "react";

import { catatPatroli } from "@/app/actions/patroli";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { CameraCapture } from "@/components/camera-capture";
import type { FormState } from "@/lib/form";
import { formatJam } from "@/lib/format";
import type { CheckpointProgress, PatroliLogRow } from "@/lib/types";
import { useGeolocation } from "@/lib/use-geolocation";

/**
 * Blok 5 — form kunjungan patroli: scan barcode + foto bukti + GPS,
 * dikirim ke Server Action `catatPatroli` yang memvalidasi jarak.
 */
export function PatroliClient({
  checkpoints,
  logs,
}: {
  checkpoints: CheckpointProgress[];
  logs: PatroliLogRow[];
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

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Kolom kiri: scanner + bukti */}
      <section className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">Scan Titik</h2>
          <span className={`badge ${kode ? "badge-green" : "badge-slate"}`}>
            {kode ? "Barcode terbaca" : "Menunggu scan"}
          </span>
        </div>

        <form action={formAction} className="mt-4 flex flex-col gap-4">
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

          <div className="field">
            <label className="field-label" htmlFor="kode">
              Kode Barcode
            </label>
            <input
              className="input"
              id="kode"
              name="kode"
              type="text"
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              placeholder="Hasil scan otomatis terisi di sini"
              autoComplete="off"
            />
          </div>

          <CameraCapture
            value={foto}
            onChange={setFoto}
            label="Foto Area"
            facing="environment"
            hint="Ambil foto kondisi sekitar titik patroli."
          />

          <div className="glass-inset rounded-2xl p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="field-label">Lokasi GPS</p>
                <p className="truncate text-sm font-semibold text-slate-800">
                  {koordinat ?? "Belum ada koordinat"}
                </p>
                <p className="text-xs text-slate-500">
                  {gps.loading
                    ? "Mengambil lokasi…"
                    : gps.posisi?.accuracy
                      ? `Akurasi ±${Math.round(gps.posisi.accuracy)} m`
                      : "Validasi jarak butuh GPS — tanpa lokasi kunjungan jadi TIDAK VALID."}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm shrink-0"
                onClick={gps.refresh}
                disabled={gps.loading}
              >
                {gps.loading ? "…" : "Refresh"}
              </button>
            </div>
            {gps.error ? <p className="field-error mt-2">{gps.error}</p> : null}
          </div>

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

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={pending || kode === "" || foto === null}
          >
            {pending
              ? "Menyimpan…"
              : kode === ""
                ? "Pindai barcode dulu"
                : foto === null
                  ? "Ambil foto dulu"
                  : "Catat Kunjungan"}
          </button>
        </form>
      </section>

      {/* Kolom kanan: rute + log hari ini */}
      <div className="flex flex-col gap-4">
        <section className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Rute Hari Ini</h2>
            <span className="badge badge-indigo">{checkpoints.length} titik</span>
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {checkpoints.length === 0 ? (
              <li className="text-sm text-slate-500">
                Belum ada titik patroli aktif. Hubungi SUPER_ADMIN.
              </li>
            ) : (
              checkpoints.map((cp) => (
                <li
                  key={cp.id}
                  className="glass-inset flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {cp.namaTitik}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {cp.dikunjungi
                        ? `${cp.pengunjung ?? "Anda"} · ${cp.kunjunganTerakhir ? formatJam(cp.kunjunganTerakhir) : ""}`
                        : cp.kodeBarcode}
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
        </section>

        <section className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Log Kunjungan</h2>
            <span className="badge badge-slate">{logs.length} hari ini</span>
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {logs.length === 0 ? (
              <li className="text-sm text-slate-500">
                Belum ada kunjungan tercatat hari ini.
              </li>
            ) : (
              logs.map((log) => (
                <li
                  key={log.id}
                  className="glass-inset flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {log.namaCheckpoint}
                    </p>
                    <p className="text-xs text-slate-500">
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
        </section>
      </div>
    </div>
  );
}
