/**
 * Utilitas shift & jadwal jaga (F4-2) — murni, tanpa DB.
 *
 * Jam shift disimpan sebagai "HH:MM" WIB. Tanggal jadwal disimpan sebagai
 * kolom DATE; semua konversi lewat helper di sini supaya zona waktu server
 * (UTC) tidak pernah menggeser tanggal.
 */

import type { StatusHadir } from "@/generated/prisma/client";
import { OFFSET_WIB_MS } from "./waktu";

export type ShiftJam = {
  nama: string;
  jamMulai: string;
  jamSelesai: string;
  toleransiTelatMenit: number;
};

const POLA_JAM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const SEHARI_MS = 24 * 60 * 60 * 1000;

/** Batas toleransi telat yang masuk akal (menit). */
export const TOLERANSI_MAKS_MENIT = 120;

/** "22:00" -> 1320 (menit sejak 00:00). Null bila format salah. */
export function parseJam(jam: string): number | null {
  const cocok = POLA_JAM.exec(jam.trim());
  if (!cocok) return null;
  return Number(cocok[1]) * 60 + Number(cocok[2]);
}

/** 1320 -> "22:00". */
export function formatMenit(menit: number): string {
  const dibulatkan = ((Math.round(menit) % 1440) + 1440) % 1440;
  const jam = Math.floor(dibulatkan / 60);
  const sisa = dibulatkan % 60;
  return `${String(jam).padStart(2, "0")}:${String(sisa).padStart(2, "0")}`;
}

/** "2026-11-04" -> Date 2026-11-04T00:00:00Z untuk kolom DATE. */
export function tanggalDB(tanggal: string): Date {
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  return new Date(Date.UTC(tahun, bulan - 1, hari));
}

/** Date kolom DATE -> "2026-11-04" (pakai komponen UTC, bukan lokal). */
export function tanggalDariDB(tanggal: Date): string {
  return [
    tanggal.getUTCFullYear(),
    String(tanggal.getUTCMonth() + 1).padStart(2, "0"),
    String(tanggal.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/** Senin dari pekan yang memuat `tanggal` ("YYYY-MM-DD"). */
export function awalPekan(tanggal: string): string {
  const dasar = tanggalDB(tanggal);
  const geser = (dasar.getUTCDay() + 6) % 7; // Senin = 0, Minggu = 6
  return tanggalDariDB(new Date(dasar.getTime() - geser * SEHARI_MS));
}

/** Geser tanggal "YYYY-MM-DD" sebanyak `hari` (boleh negatif). */
export function tambahHari(tanggal: string, hari: number): string {
  return tanggalDariDB(new Date(tanggalDB(tanggal).getTime() + hari * SEHARI_MS));
}

/** Tujuh tanggal Senin–Minggu untuk pekan yang memuat `tanggal`. */
export function hariPekan(tanggal: string): string[] {
  const senin = awalPekan(tanggal);
  return Array.from({ length: 7 }, (_, i) => tambahHari(senin, i));
}

/**
 * Jendela shift dalam instan absolut (UTC) untuk tanggal WIB tertentu.
 * Shift malam (selesai <= mulai) berakhir pada hari berikutnya.
 */
export function jendelaShift(
  tanggal: string,
  shift: ShiftJam,
): { mulai: Date; selesai: Date } | null {
  const mulaiMenit = parseJam(shift.jamMulai);
  const selesaiMenit = parseJam(shift.jamSelesai);
  if (mulaiMenit === null || selesaiMenit === null) return null;

  const dasar = tanggalDB(tanggal).getTime() - OFFSET_WIB_MS;
  const mulai = new Date(dasar + mulaiMenit * 60_000);
  const lewatTengahMalam = selesaiMenit <= mulaiMenit ? SEHARI_MS : 0;
  const selesai = new Date(dasar + selesaiMenit * 60_000 + lewatTengahMalam);

  return { mulai, selesai };
}

/**
 * Status saat absen masuk terhadap jadwal shift hari itu.
 * Telat bila melewati jam mulai + toleransi.
 */
export function statusMasuk(
  waktuMasuk: Date,
  shift: ShiftJam,
  tanggal: string,
): Extract<StatusHadir, "TEPAT_WAKTU" | "TELAT"> {
  const jendela = jendelaShift(tanggal, shift);
  if (!jendela) return "TEPAT_WAKTU";

  const batas =
    jendela.mulai.getTime() + Math.max(0, shift.toleransiTelatMenit) * 60_000;
  return waktuMasuk.getTime() > batas ? "TELAT" : "TEPAT_WAKTU";
}

/**
 * Status akhir saat absen keluar.
 *
 * TELAT tetap tercatat TELAT (fakta kedatangan lebih penting untuk rekap);
 * selain itu pulang sebelum jam selesai shift ditandai PULANG_CEPAT.
 */
export function statusKeluar(
  statusAwal: StatusHadir | null,
  waktuKeluar: Date,
  shift: ShiftJam,
  tanggal: string,
): StatusHadir {
  if (statusAwal === "TELAT") return "TELAT";

  const jendela = jendelaShift(tanggal, shift);
  if (!jendela) return statusAwal ?? "TEPAT_WAKTU";

  if (waktuKeluar.getTime() < jendela.selesai.getTime()) return "PULANG_CEPAT";
  return statusAwal ?? "TEPAT_WAKTU";
}
