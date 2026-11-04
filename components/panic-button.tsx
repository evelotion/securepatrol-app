"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Siren } from "lucide-react";

import { kirimDarurat } from "@/app/actions/insiden";
import { TAHAN_DARURAT_MS } from "@/lib/insiden";

type Fase = "diam" | "menahan" | "mengirim" | "terkirim" | "gagal";

/** Ambil lokasi cepat; gagal/timeout tidak boleh menunda sinyal darurat. */
function ambilLokasi(): Promise<{ lat: string; long: string; accuracy: string }> {
  const kosong = { lat: "", long: "", accuracy: "" };
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve(kosong);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: String(p.coords.latitude),
          long: String(p.coords.longitude),
          accuracy: String(p.coords.accuracy),
        }),
      () => resolve(kosong),
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 10_000 },
    );
  });
}

/**
 * Tombol darurat: harus ditahan 2 detik (pointer atau Spasi/Enter) supaya
 * tidak terkirim karena salah pencet. Melepas sebelum waktunya membatalkan.
 */
export function PanicButton() {
  const [fase, setFase] = useState<Fase>("diam");
  const [persen, setPersen] = useState(0);
  const [pesan, setPesan] = useState<string | null>(null);
  const mulaiRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const aktifRef = useRef(false);

  const hentikanTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => hentikanTimer, [hentikanTimer]);

  const kirim = useCallback(async () => {
    setFase("mengirim");
    try {
      const lokasi = await ambilLokasi();
      const hasil = await kirimDarurat(lokasi);
      if (hasil?.ok) {
        setFase("terkirim");
        setPesan(hasil.message ?? "Sinyal darurat terkirim.");
      } else {
        setFase("gagal");
        setPesan(
          Object.values(hasil?.errors ?? {})[0] ??
            "Sinyal darurat gagal terkirim. Hubungi Danru lewat radio.",
        );
      }
    } catch {
      setFase("gagal");
      setPesan("Sinyal darurat gagal terkirim. Hubungi Danru lewat radio.");
    }
  }, []);

  const mulai = useCallback(() => {
    if (aktifRef.current || fase === "mengirim") return;
    aktifRef.current = true;
    mulaiRef.current = performance.now();
    setPesan(null);
    setFase("menahan");
    // Interval (bukan rAF rekursif) cukup halus untuk bar progres 2 detik.
    timerRef.current = window.setInterval(() => {
      const nilai = Math.min(
        100,
        ((performance.now() - mulaiRef.current) / TAHAN_DARURAT_MS) * 100,
      );
      setPersen(nilai);
      if (nilai >= 100) {
        aktifRef.current = false;
        hentikanTimer();
        void kirim();
      }
    }, 40);
  }, [fase, hentikanTimer, kirim]);

  const batal = useCallback(() => {
    if (!aktifRef.current) return;
    aktifRef.current = false;
    hentikanTimer();
    setPersen(0);
    setFase("diam");
  }, [hentikanTimer]);

  const sibuk = fase === "mengirim";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={sibuk}
        onPointerDown={mulai}
        onPointerUp={batal}
        onPointerLeave={batal}
        onPointerCancel={batal}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            mulai();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") batal();
        }}
        aria-describedby="panic-hint"
        className="relative flex min-h-16 w-full touch-none select-none items-center justify-center gap-3 overflow-hidden rounded-[var(--radius)] bg-[var(--status-bad)] px-4 text-base font-bold text-white shadow-sm transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-70"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-black/30"
          style={{ width: `${persen}%` }}
        />
        <Siren className="relative size-6" aria-hidden="true" />
        <span className="relative">
          {fase === "mengirim"
            ? "Mengirim sinyal…"
            : fase === "menahan"
              ? "Tahan terus…"
              : "TOMBOL DARURAT"}
        </span>
      </button>

      <p id="panic-hint" className="text-center text-xs text-muted-foreground">
        Tahan 2 detik untuk memanggil Danru dan Chief.
      </p>

      {pesan ? (
        <p
          role={fase === "gagal" ? "alert" : "status"}
          className={fase === "gagal" ? "alert-error" : "alert-success"}
        >
          {pesan}
        </p>
      ) : null}
    </div>
  );
}
