"use client";

import { useCallback, useEffect, useState } from "react";

/** Koordinat hasil Geolocation API. */
export type Posisi = {
  lat: number;
  long: number;
  accuracy: number | null;
};

export type GeolocationState = {
  posisi: Posisi | null;
  loading: boolean;
  error: string | null;
  /** Minta lokasi terbaru (dipanggil ulang oleh tombol refresh). */
  refresh: () => void;
};

const PESAN: Record<string, string> = {
  PERMISSION_DENIED:
    "Izin lokasi ditolak. Aktifkan akses lokasi di pengaturan browser untuk absensi/patroli terverifikasi.",
  POSITION_UNAVAILABLE: "Sinyal GPS tidak tersedia. Coba lagi di tempat terbuka.",
  TIMEOUT: "Timeout mengambil lokasi. Coba lagi.",
};

type Options = {
  /** Minta lokasi otomatis saat komponen dipasang. Default true. */
  auto?: boolean;
  enableHighAccuracy?: boolean;
  timeoutMs?: number;
};

/**
 * Hook Geolocation API — mengambil koordinat perangkat dan menyimpannya
 * sebagai string siap kirim ke Server Action.
 */
export function useGeolocation(options: Options = {}): GeolocationState {
  const { auto = true, enableHighAccuracy = true, timeoutMs = 15_000 } = options;

  const [posisi, setPosisi] = useState<Posisi | null>(null);
  // `auto` -> loading sejak awal, jadi effect tidak perlu setState sinkron.
  const [loading, setLoading] = useState(auto);
  const [error, setError] = useState<string | null>(null);

  const onSuccess = useCallback((position: GeolocationPosition) => {
    setPosisi({
      lat: position.coords.latitude,
      long: position.coords.longitude,
      accuracy:
        typeof position.coords.accuracy === "number"
          ? position.coords.accuracy
          : null,
    });
    setLoading(false);
  }, []);

  const onError = useCallback((err: GeolocationPositionError) => {
    setError(PESAN[err.code] ?? "Gagal mengambil lokasi perangkat.");
    setLoading(false);
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("Perangkat ini tidak mendukung Geolocation API.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy,
      timeout: timeoutMs,
      maximumAge: 0,
    });
  }, [enableHighAccuracy, timeoutMs, onSuccess, onError]);

  const refresh = useCallback(() => request(), [request]);

  // Ambil lokasi otomatis saat komponen dipasang. Hanya memanggil API eksternal
  // (callback-nya async), jadi tidak ada setState sinkron di dalam effect.
  useEffect(() => {
    if (!auto) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return;
    }
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy,
      timeout: timeoutMs,
      maximumAge: 0,
    });
  }, [auto, enableHighAccuracy, timeoutMs, onSuccess, onError]);

  return { posisi, loading, error, refresh };
}
