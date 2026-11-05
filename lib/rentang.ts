import { tambahHari } from "./shift";
import { tanggalWIB } from "./waktu";

/** Filter rentang tanggal WIB (`YYYY-MM-DD`) untuk laporan & audit — murni, mudah diuji. */

export type Rentang = {
  dari: string;
  sampai: string;
  /** Pesan bila input pengguna ditolak dan diganti nilai bawaan; null bila bersih. */
  error: string | null;
};

export function isTanggalValid(nilai: string | undefined): nilai is string {
  if (!nilai || !/^\d{4}-\d{2}-\d{2}$/.test(nilai)) return false;
  const [t, b, h] = nilai.split("-").map(Number) as [number, number, number];
  const d = new Date(Date.UTC(t, b - 1, h));
  return d.getUTCFullYear() === t && d.getUTCMonth() === b - 1 && d.getUTCDate() === h;
}

/** Jumlah hari inklusif antara dua tanggal valid. */
export function hariAntara(dari: string, sampai: string): number {
  const ms = Date.parse(`${sampai}T00:00:00Z`) - Date.parse(`${dari}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

export function parseRentang(
  dariRaw: string | undefined,
  sampaiRaw: string | undefined,
  opsi: { hariBawaan: number; hariMaks: number; sekarang?: Date },
): Rentang {
  const hariIni = tanggalWIB(opsi.sekarang ?? new Date());
  const bawaan = (error: string | null): Rentang => ({
    dari: tambahHari(hariIni, -(opsi.hariBawaan - 1)),
    sampai: hariIni,
    error,
  });

  // Tidak ada input sama sekali: pakai bawaan tanpa pesan galat.
  if (!dariRaw && !sampaiRaw) return bawaan(null);

  const dari = dariRaw || tambahHari(sampaiRaw ?? hariIni, -(opsi.hariBawaan - 1));
  const sampai = sampaiRaw || hariIni;

  if (!isTanggalValid(dari) || !isTanggalValid(sampai)) {
    return bawaan("Format tanggal harus YYYY-MM-DD.");
  }
  if (dari > sampai) return bawaan("Tanggal mulai tidak boleh setelah tanggal akhir.");
  if (hariAntara(dari, sampai) > opsi.hariMaks) {
    return bawaan(`Rentang maksimal ${opsi.hariMaks} hari.`);
  }
  return { dari, sampai, error: null };
}
