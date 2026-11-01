"use client";

import { useActionState, useState } from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Navigation,
} from "lucide-react";

import Link from "next/link";

import { checkIn, checkOut } from "@/app/actions/absensi";
import { CameraCapture } from "@/components/camera-capture";
import { GpsStatus } from "@/components/gps-status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FormState } from "@/lib/form";
import { formatJam } from "@/lib/format";
import type { AbsensiHariIni } from "@/lib/types";
import { useGeolocation, type GeolocationState } from "@/lib/use-geolocation";
import { shiftDariJam } from "@/lib/ui";
import { jamWIB } from "@/lib/waktu";

export function AbsensiClient({
  absensi,
  actorName,
}: {
  absensi: AbsensiHariIni | null;
  actorName: string;
}) {
  if (absensi && absensi.waktuKeluar) {
    return <RingkasanSelesai absensi={absensi} />;
  }

  const mode = absensi === null ? "masuk" : "keluar";
  const shift = absensi
    ? shiftDariJam(Number(jamWIB(new Date(absensi.waktuMasuk)).slice(0, 2)))
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-border bg-card px-3 py-2.5 text-sm">
        <Clock
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="min-w-0 text-muted-foreground">
          {absensi ? (
            <>
              Sudah masuk pukul{" "}
              <span className="mono-num font-semibold text-foreground">
                {formatJam(absensi.waktuMasuk)}
              </span>
              {shift ? ` · ${shift}` : ""}. Selfie berikutnya untuk absen keluar.
            </>
          ) : (
            <>Belum ada absensi hari ini. Mulai dengan selfie masuk.</>
          )}
        </p>
      </div>

      <AbsenFlow mode={mode} actorName={actorName} absensi={absensi} />
    </div>
  );
}

function AbsenFlow({
  mode,
  actorName,
  absensi,
}: {
  mode: "masuk" | "keluar";
  actorName: string;
  absensi: AbsensiHariIni | null;
}) {
  const action = mode === "masuk" ? checkIn : checkOut;
  const label = mode === "masuk" ? "Absen Masuk" : "Absen Keluar";
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    undefined,
  );
  const gps = useGeolocation();
  const [foto, setFoto] = useState<string | null>(null);
  const [waktuFoto, setWaktuFoto] = useState<Date | null>(null);

  const koordinat = gps.posisi
    ? `${gps.posisi.lat.toFixed(6)}, ${gps.posisi.long.toFixed(6)}`
    : null;

  function pilihFoto(key: string | null) {
    setFoto(key);
    setWaktuFoto(key ? new Date() : null);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
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

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="section-title">{label}</p>
            <p className="truncate text-xs text-muted-foreground">
              {mode === "masuk"
                ? "Posisikan wajah di dalam bingkai."
                : `Masuk ${formatJam(absensi?.waktuMasuk ?? "")} · ambil selfie keluar.`}
            </p>
          </div>
          <span className="badge badge-slate shrink-0">Selfie</span>
        </div>

        <div className="p-4">
          <CameraCapture
            value={foto}
            onChange={pilihFoto}
            label="Selfie"
            facing="user"
            hero
            faceFrame
            watermark={watermarkText(gps, actorName)}
          />
        </div>
      </Card>

      <GpsStatus gps={gps} koordinat={koordinat} />

      {foto ? (
        <Card className="p-4">
          <h2 className="section-title">Konfirmasi absensi</h2>
          <dl className="mt-3 flex flex-col gap-2.5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Jam</dt>
              <dd className="mono-num text-right font-semibold text-foreground">
                {waktuFoto ? formatJam(waktuFoto) : "—"} WIB
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground">Lokasi</dt>
              <dd className="min-w-0 text-right font-medium text-foreground">
                {koordinat ?? "GPS tidak tersedia"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Akurasi</dt>
              <dd className="text-right font-medium text-foreground">
                {gps.posisi?.accuracy
                  ? `±${Math.round(gps.posisi.accuracy)} m`
                  : "Tidak diketahui"}
              </dd>
            </div>
          </dl>

          <input type="hidden" name="foto" value={foto} />
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

          <Button type="submit" size="lg" className="mt-4 w-full" disabled={pending}>
            {pending ? "Mengirim…" : `Kirim ${label}`}
          </Button>
        </Card>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Ambil selfie untuk melanjutkan.
        </p>
      )}
    </form>
  );
}


function RingkasanSelesai({ absensi }: { absensi: AbsensiHariIni }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-border bg-card px-3 py-2.5">
        <CheckCircle2
          className="mt-0.5 size-4 shrink-0 text-[var(--status-ok-text)]"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">
          Absensi hari ini sudah lengkap. Sampai jumpa di shift berikutnya.
        </p>
      </div>

      <Card className="p-4">
        <h2 className="section-title">Bukti absensi</h2>
        <ul className="mt-3 flex flex-col gap-4">
          <BuktiBaris
            judul="Masuk"
            jam={absensi.waktuMasuk}
            fotoUrl={absensi.fotoMasukUrl}
            lat={absensi.latMasuk}
            long={absensi.longMasuk}
          />
          <BuktiBaris
            judul="Keluar"
            jam={absensi.waktuKeluar ?? ""}
            fotoUrl={absensi.fotoKeluarUrl}
            lat={absensi.latKeluar}
            long={absensi.longKeluar}
          />
        </ul>
      </Card>

      <Button asChild variant="outline" className="w-full">
        <Link href="/beranda">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kembali ke Beranda
        </Link>
      </Button>
    </div>
  );
}

function BuktiBaris({
  judul,
  jam,
  fotoUrl,
  lat,
  long,
}: {
  judul: string;
  jam: string;
  fotoUrl: string | null;
  lat: string | null;
  long: string | null;
}) {
  return (
    <li className="flex items-start gap-3">
      {fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fotoUrl}
          alt={`Selfie absen ${judul}`}
          className="size-20 shrink-0 rounded-[var(--radius-sm)] border border-border object-cover"
        />
      ) : (
        <span className="flex size-20 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-muted text-muted-foreground">
          <Navigation className="size-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{judul}</p>
        <p className="mono-num text-sm text-foreground">{formatJam(jam)} WIB</p>
        <p className="mt-0.5 break-words text-xs text-muted-foreground">
          {lat && long ? `${lat}, ${long}` : "Tanpa koordinat GPS"}
        </p>
      </div>
    </li>
  );
}

function watermarkText(gps: GeolocationState, actorName: string): string {
  const coordinateText = gps.posisi
    ? `${gps.posisi.lat.toFixed(6)}, ${gps.posisi.long.toFixed(6)}`
    : "Lokasi GPS tidak tersedia";
  return `${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}\n${coordinateText}\n${actorName}`;
}
