/**
 * F4-2 — logika murni penilaian kehadiran terhadap jadwal shift.
 *
 * Modul ini sengaja tidak mengimpor `server-only`/Prisma supaya aturan
 * pemilihan jadwal dan pencocokan absensi bisa diuji tanpa database.
 * Semua batas hari memakai WIB (lihat `lib/waktu.ts`), bukan jam server.
 */

import {
  jendelaShift,
  tambahHari,
  tanggalDB,
  type ShiftJam,
} from "./shift";
import { OFFSET_WIB_MS, tanggalWIB } from "./waktu";

/**
 * Toleransi check-in lebih awal: absen 21:50 untuk shift 22:00 tetap dihitung
 * hadir (bukan TIDAK_HADIR). Tanpa toleransi ini check-in lebih awal jatuh di
 * luar jendela shift dan cron menandainya tidak hadir.
 */
export const TOLERANSI_AWAL_MENIT = 120;

const TOLERANSI_AWAL_MS = TOLERANSI_AWAL_MENIT * 60_000;

/** Shift yang sudah tersimpan (punya id) — bentuk minimal untuk penilaian. */
export type ShiftBerjadwal = ShiftJam & { id: string };

/** Jadwal shift pada satu tanggal WIB. */
export type JadwalBertanggal = {
  tanggal: string;
  shift: ShiftBerjadwal;
};

/** Baris absensi ringkas yang dipakai untuk pencocokan (tanpa kolom foto). */
export type AbsensiCocok = {
  userId: string;
  waktuMasuk: Date;
  shiftId: string | null;
  statusHadir: string | null;
};

/** Jadwal yang akan dinilai cron, lengkap dengan kunci relasinya. */
export type JadwalPenilaian = {
  jadwalId: string;
  userId: string;
  shiftId: string;
  shift: ShiftBerjadwal;
};

export type AlasanTidakHadir =
  /** Tidak ada absensi yang cocok — buat baris TIDAK_HADIR. */
  | "DITANDAI"
  /** Sudah ada absensi kehadiran (termasuk check-in lebih awal). */
  | "HADIR"
  /** Baris TIDAK_HADIR sudah ada — jangan buat baris ganda. */
  | "SUDAH_DITANDAI"
  /** Shift belum selesai, belum bisa dinilai. */
  | "BELUM_SELESAI";

export type KeputusanTidakHadir = {
  jadwal: JadwalPenilaian;
  jendela: { mulai: Date; selesai: Date };
  alasan: AlasanTidakHadir;
};

/** 00:00 WIB dari tanggal `YYYY-MM-DD` sebagai instan absolut. */
export function awalTanggalWIB(tanggal: string): Date {
  return new Date(tanggalDB(tanggal).getTime() - OFFSET_WIB_MS);
}

/**
 * Rentang kehadiran satu jadwal: `[mulai - 2 jam, selesai)`.
 * Null bila jam shift tidak valid.
 */
export function rentangKehadiran(
  tanggal: string,
  shift: ShiftJam,
): { mulai: Date; selesai: Date } | null {
  const jendela = jendelaShift(tanggal, shift);
  if (!jendela) return null;

  return {
    mulai: new Date(jendela.mulai.getTime() - TOLERANSI_AWAL_MS),
    selesai: jendela.selesai,
  };
}

/**
 * Apakah satu baris absensi membuktikan kehadiran pada jadwal tersebut.
 *
 * Cocok bila salah satu benar:
 * 1. `waktuMasuk` di dalam `[mulai - 2 jam, selesai)` — menangani check-in
 *    lebih awal, shift malam yang lewat tengah malam, dan pulang terlambat.
 * 2. `shiftId` absensi sama dengan shift jadwal dan `waktuMasuk` berada pada
 *    tanggal jadwal itu hingga shift selesai — menangani absensi yang sengaja
 *    ditandai shift-nya walau jam masuknya jauh di luar jendela.
 */
export function absensiCocokJadwal(
  tanggal: string,
  shift: ShiftBerjadwal,
  absensi: AbsensiCocok,
): boolean {
  const jendela = jendelaShift(tanggal, shift);
  if (!jendela) return false;

  const waktu = absensi.waktuMasuk.getTime();
  const selesai = jendela.selesai.getTime();
  const mulaiToleran = jendela.mulai.getTime() - TOLERANSI_AWAL_MS;

  if (waktu >= mulaiToleran && waktu < selesai) return true;

  return (
    absensi.shiftId === shift.id &&
    waktu >= awalTanggalWIB(tanggal).getTime() &&
    waktu < selesai
  );
}

/**
 * Jadwal yang jendelanya `[mulai - 2 jam, selesai)` memuat `sekarang`.
 *
 * Dipakai check-in: kandidat hari ini dan kemarin dikirim bersamaan, lalu
 * dipilih yang sedang berjalan (bila dua-duanya cocok, ambil yang paling baru
 * dimulai). Null bila tidak ada shift yang sedang berjalan.
 */
export function jadwalBerlaku(
  sekarang: Date,
  kandidat: JadwalBertanggal[],
): JadwalBertanggal | null {
  const waktu = sekarang.getTime();
  let terpilih: JadwalBertanggal | null = null;
  let mulaiTerpilih = Number.NEGATIVE_INFINITY;

  for (const kandidatJadwal of kandidat) {
    const jendela = jendelaShift(kandidatJadwal.tanggal, kandidatJadwal.shift);
    if (!jendela) continue;

    const mulai = jendela.mulai.getTime() - TOLERANSI_AWAL_MS;
    if (waktu < mulai || waktu >= jendela.selesai.getTime()) continue;
    if (mulai <= mulaiTerpilih) continue;

    terpilih = kandidatJadwal;
    mulaiTerpilih = mulai;
  }

  return terpilih;
}

/**
 * Dua tanggal jadwal yang dinilai cron: kemarin dan kemarin lusa.
 *
 * Cron berjalan 00:10 WIB. Shift malam tanggal D baru selesai 06:00 WIB D+1,
 * sehingga pada cron D+1 jadwalnya masih BELUM_SELESAI. Karena jendela cron
 * dua tanggal, jadwal itu dinilai ulang pada cron D+2 dan tidak pernah hilang.
 */
export function tanggalPenilaian(sekarang: Date): string[] {
  const hariIni = tanggalWIB(sekarang);
  return [tambahHari(hariIni, -1), tambahHari(hariIni, -2)];
}

/**
 * Putuskan jadwal mana yang perlu ditandai TIDAK_HADIR. Murni: tanpa DB,
 * sehingga idempotensi (cron dijalankan dua kali) bisa diuji langsung.
 */
export function nilaiTidakHadir(
  tanggal: string,
  jadwal: JadwalPenilaian[],
  absensi: AbsensiCocok[],
  sekarang: Date,
): KeputusanTidakHadir[] {
  const keputusan: KeputusanTidakHadir[] = [];

  for (const baris of jadwal) {
    const jendela = jendelaShift(tanggal, baris.shift);
    if (!jendela) continue;

    if (jendela.selesai.getTime() > sekarang.getTime()) {
      keputusan.push({ jadwal: baris, jendela, alasan: "BELUM_SELESAI" });
      continue;
    }

    const relevan = absensi.filter(
      (row) =>
        row.userId === baris.userId &&
        absensiCocokJadwal(tanggal, baris.shift, row),
    );

    const hadir = relevan.some((row) => row.statusHadir !== "TIDAK_HADIR");
    if (hadir) {
      keputusan.push({ jadwal: baris, jendela, alasan: "HADIR" });
      continue;
    }

    const sudahDitandai = relevan.some(
      (row) => row.statusHadir === "TIDAK_HADIR",
    );
    keputusan.push({
      jadwal: baris,
      jendela,
      alasan: sudahDitandai ? "SUDAH_DITANDAI" : "DITANDAI",
    });
  }

  return keputusan;
}
