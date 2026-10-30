"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Camera, Check, RotateCcw, X } from "lucide-react";

import {
  authorizeFotoUpload,
  registerUploadedFoto,
} from "@/app/actions/foto";
import { Button } from "@/components/ui/button";

/** Captures a JPEG at 1280px/quality 0.7 and stores it in private Cloudinary. */
type Mode = "idle" | "live";

const MAX_WIDTH = 1280;
const QUALITY = 0.7;

type UploadAuthorization = Awaited<ReturnType<typeof authorizeFotoUpload>>;

export function CameraCapture({
  value,
  onChange,
  label = "Foto",
  facing = "user",
  hint,
  watermark,
  hero = false,
  faceFrame = false,
}: {
  /** Cloudinary storage key, null before capture. */
  value: string | null;
  onChange: (key: string | null) => void;
  label?: string;
  facing?: "user" | "environment";
  hint?: string;
  watermark?: string;
  /** Tampilan kamera besar untuk halaman lapangan. */
  hero?: boolean;
  /** Bingkai wajah untuk selfie absensi. */
  faceFrame?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setMode("idle");
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (mode === "live" && video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [mode]);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Kamera tidak tersedia. Halaman harus dibuka lewat HTTPS untuk mengakses kamera.");
      return;
    }

    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setMode("live");
    } catch {
      setError("Akses kamera ditolak. Izinkan kamera pada pengaturan browser untuk melanjutkan.");
    } finally {
      setBusy(false);
    }
  }, [facing]);

  const capture = useCallback(async () => {
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
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Canvas tidak didukung perangkat ini.");
      return;
    }

    if (facing === "user") {
      context.translate(width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, width, height);
    if (watermark) {
      const fontSize = Math.max(14, Math.round(width / 36));
      const padding = Math.round(fontSize * 0.65);
      context.font = `600 ${fontSize}px sans-serif`;
      context.textBaseline = "bottom";
      const lines = watermark.split("\n").slice(0, 3);
      const lineHeight = Math.round(fontSize * 1.35);
      const textWidth = Math.max(...lines.map((line) => context.measureText(line).width));
      const blockHeight = lines.length * lineHeight + padding * 2;
      context.fillStyle = "rgba(0, 0, 0, 0.62)";
      context.fillRect(0, height - blockHeight, Math.min(width, textWidth + padding * 2), blockHeight);
      context.fillStyle = "#fff";
      lines.forEach((line, index) => {
        context.fillText(line, padding, height - padding - (lines.length - index - 1) * lineHeight);
      });
    }

    setBusy(true);
    setError(null);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => result ? resolve(result) : reject(new Error("Foto tidak dapat diproses.")),
          "image/jpeg",
          QUALITY,
        );
      });
      if (blob.size > 5 * 1024 * 1024) throw new Error("Foto melebihi batas ukuran 5 MB.");
      const authorization: UploadAuthorization = await authorizeFotoUpload();
      const uploadForm = new FormData();
      uploadForm.append("file", blob, "evidence.jpg");
      uploadForm.append("api_key", authorization.apiKey);
      uploadForm.append("timestamp", String(authorization.timestamp));
      uploadForm.append("public_id", authorization.publicId);
      uploadForm.append("type", "private");
      uploadForm.append("signature", authorization.signature);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${authorization.cloudName}/image/upload`,
        { method: "POST", body: uploadForm },
      );
      const result: unknown = await response.json();
      if (!response.ok || !isUploadResponse(result)) {
        throw new Error("Cloudinary menolak unggahan foto. Coba ambil ulang.");
      }
      const key = await registerUploadedFoto({
        publicId: result.public_id,
        version: String(result.version),
        signature: result.signature,
        bytes: String(result.bytes),
        format: result.format,
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      onChange(key);
      stopStream();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unggahan foto gagal.");
    } finally {
      setBusy(false);
    }
  }, [facing, onChange, previewUrl, stopStream, watermark]);

  const retake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onChange(null);
    void start();
  }, [onChange, previewUrl, start]);

  if (value) {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative overflow-hidden rounded-[var(--radius)] border border-border bg-foreground/5">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={`Pratinjau ${label}`}
              className="mx-auto max-h-80 w-full object-cover"
            />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              Foto tersimpan dengan aman.
            </p>
          )}
          <span className="badge badge-green absolute left-2 top-2">
            <Check className="size-3.5" aria-hidden="true" />
            {label} tersimpan
          </span>
        </div>
        <Button variant="outline" onClick={retake} disabled={busy} className="w-full">
          <RotateCcw className="size-4" aria-hidden="true" />
          Foto Ulang
        </Button>
      </div>
    );
  }

  if (mode === "live") {
    return (
      <div className="flex flex-col gap-2">
        <div
          className={`relative overflow-hidden rounded-[var(--radius)] border border-border bg-black ${
            hero ? "" : "aspect-video"
          }`}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full object-cover ${facing === "user" ? "-scale-x-100" : ""} ${
              hero ? "max-h-[60dvh] min-h-72" : "h-full"
            }`}
          />

          {/* Bingkai wajah / area */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={`border-2 border-white/85 ${
                faceFrame
                  ? "h-[58%] w-[64%] rounded-[50%]"
                  : "h-[54%] w-[78%] rounded-[var(--radius)]"
              }`}
            />
          </div>
          <span className="badge chip-overlay absolute left-3 top-3">
            {label} · kamera aktif
          </span>

          {hero ? (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pb-5 pt-10">
              <button
                type="button"
                onClick={() => {
                  stopStream();
                  setError(null);
                }}
                disabled={busy}
                aria-label="Batalkan kamera"
                className="tap flex size-12 items-center justify-center rounded-full bg-white/15 text-white disabled:opacity-50"
              >
                <X className="size-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => void capture()}
                disabled={busy}
                aria-label={`Ambil ${label}`}
                className="flex size-20 items-center justify-center rounded-full border-4 border-white/80 bg-white text-slate-900 transition-transform active:scale-95 disabled:opacity-60"
              >
                {busy ? (
                  <span className="text-xs font-semibold text-slate-700">…</span>
                ) : (
                  <Camera className="size-8" aria-hidden="true" />
                )}
              </button>
              <span className="size-12" aria-hidden="true" />
            </div>
          ) : null}
        </div>

        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        {error ? <p className="field-error">{error}</p> : null}

        {hero ? null : (
          <div className="flex gap-2">
            <Button onClick={() => void capture()} disabled={busy}>
              {busy ? "Mengunggah…" : `Ambil ${label}`}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                stopStream();
                setError(null);
              }}
              disabled={busy}
            >
              Batal
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col items-start gap-3 rounded-[var(--radius)] border border-dashed border-input bg-card px-4 py-4">
        <div className="flex items-center gap-2">
          <Camera className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">{label}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {hint ?? "Ambil foto sebagai bukti kehadiran."}
        </p>
        <Button
          onClick={() => void start()}
          disabled={busy}
          size={hero ? "lg" : "default"}
          className="w-full"
        >
          {busy ? "Membuka kamera…" : "Buka Kamera"}
        </Button>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

function isUploadResponse(value: unknown): value is {
  public_id: string;
  version: number;
  signature: string;
  bytes: number;
  format: string;
} {
  if (typeof value !== "object" || value === null) return false;
  const response = value as Record<string, unknown>;
  return (
    typeof response.public_id === "string" &&
    typeof response.version === "number" &&
    typeof response.signature === "string" &&
    typeof response.bytes === "number" &&
    typeof response.format === "string"
  );
}
