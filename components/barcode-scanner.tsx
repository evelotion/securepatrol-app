"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Flashlight, FlashlightOff, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Scanner barcode/QR untuk titik patroli.
 *
 * Memakai `html5-qrcode` (di-import dinamis agar aman saat prerender SSR).
 * Kode hasil pemindaian langsung dikirim ke parent lewat `onScan`,
 * kamera otomatis dimatikan setelah satu kali scan berhasil.
 */

const VIEW_ID = "patroli-scanner-view";

type ScannerLike = {
  start: (
    camera: { facingMode: string },
    config: { fps: number; qrbox: { width: number; height: number } },
    onSuccess: (text: string) => void,
    onError?: (err: string) => void,
  ) => Promise<null>;
  stop: () => Promise<void>;
  clear: () => void;
};

/** Trek video aktif dari kamera html5-qrcode. */
function ambilVideoTrack(): MediaStreamTrack | null {
  const video = document.querySelector<HTMLVideoElement>(
    `#${VIEW_ID} video`,
  );
  const stream = video?.srcObject;
  if (!(stream instanceof MediaStream)) return null;
  return stream.getVideoTracks()[0] ?? null;
}

export function BarcodeScanner({
  onScan,
  disabled = false,
}: {
  onScan: (kode: string) => void;
  disabled?: boolean;
}) {
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchAda, setTorchAda] = useState(false);
  const [torchNyala, setTorchNyala] = useState(false);

  const scannerRef = useRef<ScannerLike | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const matikanTorch = useCallback(async () => {
    const track = ambilVideoTrack();
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: false } as unknown as MediaTrackConstraintSet],
      });
    } catch {
      /* perangkat tidak mendukung torch */
    }
  }, []);

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setTorchAda(false);
    setTorchNyala(false);
    if (!scanner) {
      setLive(false);
      return;
    }
    try {
      await matikanTorch();
      await scanner.stop();
    } catch {
      /* kamera sudah berhenti / belum pernah start */
    }
    try {
      scanner.clear();
    } catch {
      /* container sudah bersih */
    }
    setLive(false);
  }, [matikanTorch]);

  const start = useCallback(async () => {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Kamera tidak tersedia. Halaman harus dibuka lewat HTTPS untuk memindai barcode.",
      );
      return;
    }

    setBusy(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(VIEW_ID, false) as unknown as ScannerLike;
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text: string) => {
          const kode = text.trim();
          if (!kode) return;
          onScanRef.current(kode);
          void stop();
        },
      );

      setLive(true);

      // Deteksi dukungan senter setelah video benar-benar terpasang.
      for (let i = 0; i < 4; i += 1) {
        const track = ambilVideoTrack();
        if (track) {
          const capabilities = track.getCapabilities?.() as
            | (MediaTrackCapabilities & { torch?: boolean })
            | undefined;
          setTorchAda(Boolean(capabilities?.torch));
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch (err) {
      scannerRef.current = null;
      setError(
        `Gagal memulai kamera: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setBusy(false);
    }
  }, [stop]);

  const toggleTorch = useCallback(async () => {
    const track = ambilVideoTrack();
    if (!track) return;
    const berikutnya = !torchNyala;
    try {
      await track.applyConstraints({
        advanced: [{ torch: berikutnya } as unknown as MediaTrackConstraintSet],
      });
      setTorchNyala(berikutnya);
    } catch {
      setError("Senter kamera tidak bisa dinyalakan di perangkat ini.");
    }
  }, [torchNyala]);

  // Lepas kamera saat komponen dilepas.
  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/5] max-h-[58dvh] w-full overflow-hidden rounded-[var(--radius)] border border-border bg-black">
        <div id={VIEW_ID} className="scanner-view h-full w-full" />

        {!live ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <ScanLine className="size-8 text-white/70" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">Kamera nonaktif</p>
            <p className="text-xs text-white/70">
              Arahkan ke barcode titik patroli di dinding gedung.
            </p>
          </div>
        ) : (
          <>
            {/* Kotak bidik */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative size-56 max-w-[70%]">
                <span className="absolute left-0 top-0 size-8 rounded-tl-[var(--radius-sm)] border-l-4 border-t-4 border-white/90" />
                <span className="absolute right-0 top-0 size-8 rounded-tr-[var(--radius-sm)] border-r-4 border-t-4 border-white/90" />
                <span className="absolute bottom-0 left-0 size-8 rounded-bl-[var(--radius-sm)] border-b-4 border-l-4 border-white/90" />
                <span className="absolute bottom-0 right-0 size-8 rounded-br-[var(--radius-sm)] border-b-4 border-r-4 border-white/90" />
              </div>
            </div>

            <span className="badge chip-overlay absolute left-3 top-3">
              Memindai…
            </span>

            {torchAda ? (
              <button
                type="button"
                onClick={() => void toggleTorch()}
                aria-pressed={torchNyala}
                aria-label={torchNyala ? "Matikan senter" : "Nyalakan senter"}
                className="tap absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-black/55 text-white"
              >
                {torchNyala ? (
                  <Flashlight className="size-5" aria-hidden="true" />
                ) : (
                  <FlashlightOff className="size-5" aria-hidden="true" />
                )}
              </button>
            ) : null}
          </>
        )}
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      {live ? (
        <Button variant="outline" onClick={() => void stop()} disabled={busy}>
          Berhenti Memindai
        </Button>
      ) : (
        <Button
          size="lg"
          className="w-full"
          onClick={() => void start()}
          disabled={busy || disabled}
        >
          <ScanLine className="size-5" aria-hidden="true" />
          {busy ? "Membuka kamera…" : "Mulai Scan"}
        </Button>
      )}
    </div>
  );
}
