import type { Role } from "@/generated/prisma/client";
import type { StatusScan } from "@/lib/geo";

/** DTO user yang aman dikirim ke client component (tanpa hash password). */
export type UserRow = {
  id: string;
  nama: string;
  email: string;
  username: string | null;
  role: Role;
  regu: string | null;
  aktif: boolean;
  createdAt: string;
};

/** DTO checkpoint — Decimal sudah dikonversi ke string (aturan CLAUDE.md). */
export type CheckpointRow = {
  id: string;
  namaTitik: string;
  kodeBarcode: string;
  lat: string | null;
  long: string | null;
  keterangan: string | null;
  aktif: boolean;
  qrSvg: string;
};

export type DashboardStats = {
  totalUser: number;
  userAktif: number;
  totalCheckpoint: number;
  checkpointAktif: number;
};

/**
 * Absensi milik sendiri (halaman /absensi).
 * Foto base64 hanya boleh dikirim ke pemiliknya sendiri.
 */
export type AbsensiHariIni = {
  id: string;
  waktuMasuk: string;
  waktuKeluar: string | null;
  latMasuk: string | null;
  longMasuk: string | null;
  latKeluar: string | null;
  longKeluar: string | null;
  fotoMasuk: string | null;
  fotoKeluar: string | null;
  fotoMasukUrl: string | null;
  fotoKeluarUrl: string | null;
};

/** Baris absensi tim untuk dashboard — foto TIDAK ikut (hemat payload). */
export type AbsensiRow = {
  userId: string;
  nama: string;
  regu: string | null;
  role: Role;
  waktuMasuk: string;
  waktuKeluar: string | null;
};

/** Progres satu checkpoint hari ini. */
export type CheckpointProgress = {
  id: string;
  namaTitik: string;
  kodeBarcode: string;
  lat: string | null;
  long: string | null;
  aktif: boolean;
  dikunjungi: boolean;
  kunjunganTerakhir: string | null;
  pengunjung: string | null;
  jumlahValid: number;
  jumlahTidakValid: number;
  jumlahBelumTerverifikasi: number;
  statusTerakhir: StatusScan | null;
  alasanTerakhir: string | null;
};

/** Satu log patroli untuk ditampilkan (tanpa foto base64). */
export type PatroliLogRow = {
  id: string;
  waktu: string;
  namaUser: string;
  namaCheckpoint: string;
  status: StatusScan;
  alasan: string | null;
  jarakM: number | null;
  akurasiM: number | null;
};

/** Rute patroli milik satu staf hari ini. */
export type PatroliHariIni = {
  checkpoints: CheckpointProgress[];
  logs: PatroliLogRow[];
};

export type MonitoringSummary = {
  totalHadir: number;
  sedangBertugas: number;
  sudahPulang: number;
  totalCheckpointAktif: number;
  checkpointTerpatroli: number;
  logHariIni: number;
  logValid: number;
  logInvalid: number;
  logBelumTerverifikasi: number;
};

/** Data dashboard Blok 6 — satu bentuk untuk semua role. */
export type DashboardHariIni = {
  summary: MonitoringSummary;
  /** Daftar absensi tim (hanya untuk manager). */
  absensi: AbsensiRow[];
  /** Progres tiap checkpoint hari ini (hanya untuk manager). */
  checkpoints: CheckpointProgress[];
  /** Log patroli terbaru hari ini (hanya untuk manager). */
  logs: PatroliLogRow[];
};
