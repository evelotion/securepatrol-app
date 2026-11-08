"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Crosshair, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseRadius, RADIUS_MAKS_M, RADIUS_MIN_M } from "@/lib/geo";
import {
  formatKoordinat,
  gabungkanSampelGps,
  parseTautanMaps,
  peringatanAkurasi,
  type SampelGps,
} from "@/lib/koordinat";

// Leaflet menyentuh `window`, jadi hanya dimuat di browser.
const PetaPemilih = dynamic(
  () => import("@/components/peta-pemilih").then((m) => m.PetaPemilih),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full animate-pulse rounded-[var(--radius-sm)] border border-border bg-muted" />
    ),
  },
);

const JUMLAH_SAMPEL = 5;
const JEDA_SAMPEL_MS = 700;

function ambilSatuSampel(): Promise<SampelGps> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          long: p.coords.longitude,
          accuracy:
            typeof p.coords.accuracy === "number" ? p.coords.accuracy : null,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}

const jeda = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** String input -> angka, atau null bila kosong/tidak valid. */
function keAngka(nilai: string): number | null {
  const bersih = nilai.trim().replace(",", ".");
  if (bersih === "") return null;
  const n = Number(bersih);
  return Number.isFinite(n) ? n : null;
}

type StatusGps =
  | { fase: "diam" }
  | { fase: "mengambil"; ke: number }
  | { fase: "selesai"; accuracy: number | null; sampel: number }
  | { fase: "gagal"; pesan: string };

/**
 * Bagian lokasi pada form checkpoint: tombol GPS (rata-rata beberapa sampel),
 * peta pemilih, tempel tautan Google Maps, dan input angka manual (sekunder).
 * Kolom `lat` dan `long` tetap dikirim ke Server Action seperti sebelumnya.
 */
export function LokasiCheckpoint({
  latAwal,
  longAwal,
  radiusBawaanM,
  radiusAwalM,
  errorLat,
  errorLong,
  errorRadius,
}: {
  latAwal: string | null;
  longAwal: string | null;
  /** Radius sistem (PATROL_RADIUS_M) bila radius titik dikosongkan. */
  radiusBawaanM: number;
  radiusAwalM: number | null;
  errorLat?: string;
  errorLong?: string;
  errorRadius?: string;
}) {
  const [lat, setLat] = useState(latAwal ?? "");
  const [long, setLong] = useState(longAwal ?? "");
  const [radiusTeks, setRadiusTeks] = useState(
    radiusAwalM === null ? "" : String(radiusAwalM),
  );
  const [gps, setGps] = useState<StatusGps>({ fase: "diam" });
  const [tautan, setTautan] = useState("");
  const [infoTautan, setInfoTautan] = useState<{
    ok: boolean;
    pesan: string;
  } | null>(null);

  // Lingkaran peta mengikuti isian; bila kosong/tidak valid memakai radius bawaan.
  const radiusParse = parseRadius(radiusTeks);
  const radiusM =
    radiusParse.ok && radiusParse.nilai !== null ? radiusParse.nilai : radiusBawaanM;
  const latAngka = keAngka(lat);
  const longAngka = keAngka(long);

  function setTitik(nilaiLat: number, nilaiLong: number) {
    setLat(formatKoordinat(nilaiLat));
    setLong(formatKoordinat(nilaiLong));
  }

  async function pakaiLokasiSaya() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGps({ fase: "gagal", pesan: "Perangkat ini tidak mendukung GPS." });
      return;
    }

    const sampel: SampelGps[] = [];
    let galatTerakhir: string | null = null;
    for (let i = 1; i <= JUMLAH_SAMPEL; i += 1) {
      setGps({ fase: "mengambil", ke: i });
      try {
        sampel.push(await ambilSatuSampel());
      } catch (cause) {
        const kode = (cause as GeolocationPositionError | undefined)?.code;
        galatTerakhir =
          kode === 1
            ? "Izin lokasi ditolak. Aktifkan akses lokasi di pengaturan browser."
            : "Sinyal GPS tidak tersedia. Coba lagi di tempat terbuka.";
        // Izin ditolak tidak akan membaik pada percobaan berikutnya.
        if (kode === 1) break;
      }
      if (i < JUMLAH_SAMPEL) await jeda(JEDA_SAMPEL_MS);
    }

    const hasil = gabungkanSampelGps(sampel);
    if (!hasil) {
      setGps({
        fase: "gagal",
        pesan: galatTerakhir ?? "Gagal mengambil lokasi perangkat.",
      });
      return;
    }
    setTitik(hasil.lat, hasil.long);
    setGps({ fase: "selesai", accuracy: hasil.accuracy, sampel: hasil.sampel });
  }

  function terapkanTautan(teks: string) {
    setTautan(teks);
    if (teks.trim() === "") {
      setInfoTautan(null);
      return;
    }
    const titik = parseTautanMaps(teks);
    if (!titik) {
      setInfoTautan({
        ok: false,
        pesan:
          "Koordinat tidak ditemukan. Gunakan tautan panjang yang memuat @lat,long atau ?q=lat,long (tautan pendek maps.app.goo.gl belum didukung).",
      });
      return;
    }
    setTitik(titik.lat, titik.long);
    setInfoTautan({ ok: true, pesan: "Koordinat diambil dari tautan." });
  }

  const peringatan =
    gps.fase === "selesai" ? peringatanAkurasi(gps.accuracy) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="field-label">Lokasi titik</p>
        <p className="text-xs text-muted-foreground">
          Berdiri di titik ini lalu tekan <strong>Pakai lokasi saya</strong>.
          Atau klik peta / geser pin untuk menentukan titik.
        </p>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void pakaiLokasiSaya()}
          disabled={gps.fase === "mengambil"}
        >
          <Crosshair className="size-4" aria-hidden="true" />
          {gps.fase === "mengambil"
            ? `Mengambil lokasi… (${gps.ke}/${JUMLAH_SAMPEL})`
            : "Pakai lokasi saya sekarang"}
        </Button>

        {gps.fase === "selesai" ? (
          <p
            role="status"
            className={peringatan ? "alert-error" : "alert-success"}
          >
            Lokasi terisi dari {gps.sampel} sampel terbaik
            {gps.accuracy !== null ? ` · akurasi ±${gps.accuracy} m` : ""}.
            {peringatan ? ` ${peringatan}` : ""}
          </p>
        ) : null}
        {gps.fase === "gagal" ? (
          <p role="alert" className="alert-error">
            {gps.pesan}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <PetaPemilih
          lat={latAngka}
          long={longAngka}
          radiusM={radiusM}
          onPilih={setTitik}
        />
        <p className="text-xs text-muted-foreground">
          Lingkaran biru = radius scan valid ({radiusM} m dari titik).
        </p>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="radiusM">
          Radius titik (meter){" "}
          <span className="normal-case">
            (opsional, kosong = bawaan {radiusBawaanM} m)
          </span>
        </label>
        <Input
          id="radiusM"
          name="radiusM"
          type="number"
          inputMode="numeric"
          min={RADIUS_MIN_M}
          max={RADIUS_MAKS_M}
          value={radiusTeks}
          onChange={(e) => setRadiusTeks(e.target.value)}
          placeholder={String(radiusBawaanM)}
          aria-invalid={Boolean(errorRadius) || !radiusParse.ok}
          className="mono-num"
        />
        <p className="text-xs text-muted-foreground">
          Persempit untuk titik di dalam gedung (mis. 30 m) agar scan dari titik
          lain di gedung yang sama tidak lolos.
        </p>
        {errorRadius || !radiusParse.ok ? (
          <p className="field-error">
            {errorRadius ?? (radiusParse.ok ? "" : radiusParse.error)}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="tautanMaps">
          <Link2 className="mr-1 inline size-3.5" aria-hidden="true" />
          Tempel link Google Maps{" "}
          <span className="normal-case">(opsional)</span>
        </label>
        <Input
          id="tautanMaps"
          type="url"
          inputMode="url"
          autoComplete="off"
          value={tautan}
          onChange={(e) => terapkanTautan(e.target.value)}
          placeholder="https://www.google.com/maps/@-6.2,106.8,17z"
        />
        {infoTautan ? (
          <p className={infoTautan.ok ? "text-xs text-[var(--status-ok-text)]" : "field-error"}>
            {infoTautan.pesan}
          </p>
        ) : null}
      </div>

      {/* Galat tetap terlihat walau bagian manual sedang tertutup. */}
      {errorLat || errorLong ? (
        <p role="alert" className="field-error">
          {errorLat ?? errorLong}
        </p>
      ) : null}

      <details className="rounded-[var(--radius-sm)] border border-border px-3 py-2 open:pb-3">
        <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
          Atur manual (latitude / longitude)
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="field">
            <label className="field-label" htmlFor="lat">
              Latitude
            </label>
            <Input
              id="lat"
              name="lat"
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="-6.2000000"
              aria-invalid={Boolean(errorLat)}
              className="mono-num"
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="long">
              Longitude
            </label>
            <Input
              id="long"
              name="long"
              inputMode="decimal"
              value={long}
              onChange={(e) => setLong(e.target.value)}
              placeholder="106.8166667"
              aria-invalid={Boolean(errorLong)}
              className="mono-num"
            />
          </div>
        </div>
      </details>
    </div>
  );
}
