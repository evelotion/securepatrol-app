/**
 * Helper tampilan murni (tanpa DOM & tanpa DB) supaya mudah diuji.
 * Dipakai halaman beranda, absensi, dan dashboard.
 */

import type { StatusScan } from "@/lib/geo";

export type Tone = "ok" | "warn" | "bad" | "neutral";

/**
 * Label shift dari jam masuk WIB.
 * Pembagian sementara sampai tabel Shift/Jadwal (F4-2) tersedia.
 */
export function shiftDariJam(jam: number): string {
  if (jam >= 6 && jam < 14) return "Shift Pagi";
  if (jam >= 14 && jam < 18) return "Shift Siang";
  return "Shift Malam";
}

/** Warna indikator GPS berdasarkan akurasi (meter). */
export function toneAkurasi(akurasiM: number | null): Tone {
  if (akurasiM === null || !Number.isFinite(akurasiM)) return "neutral";
  if (akurasiM <= 20) return "ok";
  if (akurasiM <= 50) return "warn";
  return "bad";
}

/** Persentase progres, dibulatkan dan dibatasi 0–100. */
export function persenProgres(dikunjungi: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((dikunjungi / total) * 100)));
}

/** Teks & tone status scan patroli — status selalu warna + ikon + teks. */
export function labelStatusScan(status: StatusScan | null): {
  label: string;
  tone: Tone;
} {
  if (status === "VALID") return { label: "Valid", tone: "ok" };
  if (status === "BELUM_TERVERIFIKASI") {
    return { label: "Belum terverifikasi", tone: "warn" };
  }
  if (status === "TIDAK_VALID") return { label: "Tidak valid", tone: "bad" };
  return { label: "Belum dikunjungi", tone: "neutral" };
}
