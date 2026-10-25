"use client";

import { useActionState, useState } from "react";

import { checkIn, checkOut } from "@/app/actions/absensi";
import { CameraCapture } from "@/components/camera-capture";
import type { FormState } from "@/lib/form";
import { formatJam } from "@/lib/format";
import type { AbsensiHariIni } from "@/lib/types";
import { useGeolocation, type GeolocationState } from "@/lib/use-geolocation";

/**
 * Blok 4 — tombol Absen Masuk / Absen Keluar.
 *
 * Setiap kartu punya selfie (CameraCapture) + koordinat (useGeolocation)
 * yang dikirim sebagai input tersembunyi ke Server Action `checkIn`/`checkOut`.
 */
export function AbsensiClient({ absensi }: { absensi: AbsensiHariIni | null }) {
  const gps = useGeolocation();

  const belumMasuk = absensi === null;
  const belumKeluar = absensi !== null && absensi.waktuKeluar === null;
  const selesai = absensi !== null && absensi.waktuKeluar !== null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AbsenCard
        mode="masuk"
        gps={gps}
        disabled={!belumMasuk}
        disabledReason={
          belumMasuk
            ? null
            : selesai
              ? "Absensi hari ini sudah ditutup."
              : `Sudah absen masuk pukul ${formatJam(absensi.waktuMasuk)}.`
        }
        fotoTersimpan={absensi?.fotoMasuk ?? null}
        jamTersimpan={absensi ? formatJam(absensi.waktuMasuk) : null}
        koordinatTersimpan={
          absensi?.latMasuk && absensi?.longMasuk
            ? `${absensi.latMasuk}, ${absensi.longMasuk}`
            : null
        }
      />

      <AbsenCard
        mode="keluar"
        gps={gps}
        disabled={!belumKeluar}
        disabledReason={
          belumKeluar
            ? null
            : belumMasuk
              ? "Belum ada absen masuk hari ini."
              : `Sudah absen keluar pukul ${formatJam(absensi.waktuKeluar ?? "")}.`
        }
        fotoTersimpan={absensi?.fotoKeluar ?? null}
        jamTersimpan={absensi?.waktuKeluar ? formatJam(absensi.waktuKeluar) : null}
        koordinatTersimpan={
          absensi?.latKeluar && absensi?.longKeluar
            ? `${absensi.latKeluar}, ${absensi.longKeluar}`
            : null
        }
      />
    </div>
  );
}

function AbsenCard({
  mode,
  gps,
  disabled,
  disabledReason,
  fotoTersimpan,
  jamTersimpan,
  koordinatTersimpan,
}: {
  mode: "masuk" | "keluar";
  gps: GeolocationState;
  disabled: boolean;
  disabledReason: string | null;
  fotoTersimpan: string | null;
  jamTersimpan: string | null;
  koordinatTersimpan: string | null;
}) {
  const action = mode === "masuk" ? checkIn : checkOut;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  const [foto, setFoto] = useState<string | null>(null);
  const label = mode === "masuk" ? "Absen Masuk" : "Absen Keluar";

  const koordinat = gps.posisi
    ? `${gps.posisi.lat.toFixed(6)}, ${gps.posisi.long.toFixed(6)}`
    : null;

  if (disabled) {
    return (
      <section className="glass rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">{label}</h2>
          <span className="badge badge-slate">Nonaktif</span>
        </div>

        {fotoTersimpan ? (
          <div className="mt-4 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotoTersimpan}
              alt={`Bukti ${label}`}
              className="h-24 w-24 rounded-2xl border border-white/80 object-cover"
            />
            <div className="text-sm text-slate-600">
              <p className="font-semibold text-slate-800">
                Tercatat pukul {jamTersimpan}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {koordinatTersimpan
                  ? `GPS: ${koordinatTersimpan}`
                  : "Tanpa koordinat GPS"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">{disabledReason}</p>
        )}
      </section>
    );
  }

  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">{label}</h2>
        <span className="badge badge-amber">Menunggu</span>
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

        <CameraCapture
          value={foto}
          onChange={setFoto}
          label="Selfie"
          facing="user"
          hint="Wajib — selfie terbaru Anda hari ini."
        />
        {state?.errors?.foto && foto ? (
          <p className="field-error">{state.errors.foto}</p>
        ) : null}

        <GpsPanel gps={gps} koordinat={koordinat} />

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
          disabled={pending || foto === null}
        >
          {pending
            ? "Menyimpan…"
            : foto === null
              ? "Ambil selfie dulu"
              : label}
        </button>
      </form>
    </section>
  );
}

/** Peta kecil lokasi berupa ringkasan koordinat + akurasi + tombol refresh. */
function GpsPanel({
  gps,
  koordinat,
}: {
  gps: GeolocationState;
  koordinat: string | null;
}) {
  return (
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
                : "Kirim tanpa GPS bila izin ditolak (akan tercatat tanpa koordinat)."}
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
  );
}
