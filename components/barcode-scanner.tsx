"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Scanner barcode/QR untuk titik patroli (Blok 5).
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

  const scannerRef = useRef<ScannerLike | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) {
      setLive(false);
      return;
    }
    try {
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
  }, []);

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
    } catch (err) {
      scannerRef.current = null;
      setError(
        `Gagal memulai kamera: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setBusy(false);
    }
  }, [stop]);

  // Lepas kamera saat komponen dilepas.
  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/80 bg-slate-900">
        <div id={VIEW_ID} className="h-full w-full" />
        {!live ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center">
            <p className="text-sm font-semibold text-white">Kamera nonaktif</p>
            <p className="text-xs text-slate-300">
              Arahkan ke barcode titik patroli di dinding gedung.
            </p>
          </div>
        ) : (
          <span className="badge badge-amber absolute left-2 top-2">
            Memindai…
          </span>
        )}
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      <div className="flex gap-2">
        {live ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void stop()}
            disabled={busy}
          >
            Berhenti
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => void start()}
            disabled={busy || disabled}
          >
            {busy ? "Membuka…" : "Mulai Scan"}
          </Button>
        )}
      </div>
    </div>
  );
}
