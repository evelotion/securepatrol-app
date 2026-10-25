"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Capture foto dengan API native HTML5 (getUserMedia + canvas).
 *
 * Dipakai untuk selfie absensi (Blok 4) dan foto bukti patroli (Blok 5).
 * Foto disimpan sebagai data URL base64 (`data:image/jpeg;base64,...`) —
 * sesuai batasan MVP yang belum pakai Cloudinary/S3.
 */

type Mode = "idle" | "live";

const MAX_WIDTH = 720; // batas lebar piksel agar payload base64 tetap ringan
const QUALITY = 0.72;

export function CameraCapture({
  value,
  onChange,
  label = "Foto",
  facing = "user",
  hint,
}: {
  /** Foto terpilih dalam bentuk data URL base64, null bila belum ada. */
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  /** "user" untuk selfie, "environment" untuk foto kondisi area. */
  facing?: "user" | "environment";
  hint?: string;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setMode("idle");
  }, []);

  // Pastikan kamera selalu dilepas saat komponat dilepas.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  // Pasang stream ke <video> setelah elemennya dirender.
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (mode === "live" && video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {
        /* autoplay selalu dimulai dari gesture pengguna */
      });
    }
  }, [mode]);

  const start = useCallback(async () => {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Kamera tidak tersedia. Halaman harus dibuka lewat HTTPS untuk mengakses kamera.",
      );
      return;
    }

    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setMode("live");
    } catch {
      setError(
        "Akses kamera ditolak. Izinkan kamera pada pengaturan browser untuk melanjutkan.",
      );
    } finally {
      setBusy(false);
    }
  }, [facing]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("Kamera belum siap, tunggu sebentar lalu coba lagi.");
      return;
    }

    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Canvas tidak didukung perangkat ini.");
      return;
    }

    // Kamera depan tampil cermin di layar, jadi dibalik agar hasil alami.
    if (facing === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    onChange(canvas.toDataURL("image/jpeg", QUALITY));
    stopStream();
    setError(null);
  }, [facing, onChange, stopStream]);

  const retake = useCallback(() => {
    onChange(null);
    void start();
  }, [onChange, start]);

  if (value) {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-slate-900/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={`Pratinjau ${label}`}
            className="mx-auto max-h-72 w-auto rounded-2xl object-contain"
          />
          <span className="badge badge-green absolute left-2 top-2">
            {label} tersimpan
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={retake}>
            Foto Ulang
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "live") {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-slate-900">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`aspect-[4/3] w-full object-cover ${
              facing === "user" ? "-scale-x-100" : ""
            }`}
          />
          <span className="badge badge-amber absolute left-2 top-2">
            {label} · kamera aktif
          </span>
        </div>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
        {error ? <p className="field-error">{error}</p> : null}
        <div className="flex gap-2">
          <Button size="sm" onClick={capture}>
            Ambil {label}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              stopStream();
              setError(null);
            }}
          >
            Batal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-white/90 bg-white/40 px-3 py-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {hint ?? "Ambil foto sebagai bukti kehadiran."}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => void start()}
          disabled={busy}
        >
          {busy ? "Membuka…" : "Buka Kamera"}
        </Button>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
