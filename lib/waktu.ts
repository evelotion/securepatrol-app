/**
 * Utilitas waktu berbasis zona `Asia/Jakarta` (WIB, UTC+7).
 *
 * Jam server (Vercel/Neon) selalu UTC, sehingga `date.setHours(0,0,0,0)`
 * menghasilkan "hari ini" yang berganti pukul 07:00 WIB dan membuat absensi
 * shift malam terpecah dua (F1-1). Semua batas hari dan jendela waktu wajib
 * dihitung lewat fungsi di sini — jangan memakai jam server.
 */

/** Zona waktu resmi aplikasi (PRD: seluruh operasi gedung di WIB). */
export const ZONA_WIB = "Asia/Jakarta";

/** Offset WIB terhadap UTC dalam milidetik (UTC+7, tanpa DST). */
export const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

/**
 * Jendela absensi terbuka: check-out masih boleh dilakukan hingga 16 jam
 * setelah check-in, supaya shift malam 22:00 → 06:00 tetap satu baris.
 */
export const JENDELA_ABSENSI_JAM = 16;

const FORMAT_WIB = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_WIB,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Ambil komponen waktu lokal WIB dari sebuah Date. */
function komponenWIB(now: Date): {
  tahun: number;
  bulan: number;
  hari: number;
  jam: number;
  menit: number;
  detik: number;
} {
  const parts = FORMAT_WIB.formatToParts(now);
  const ambil = (t: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");

  return {
    tahun: ambil("year"),
    bulan: ambil("month"),
    hari: ambil("day"),
    jam: ambil("hour"),
    menit: ambil("minute"),
    detik: ambil("second"),
  };
}

/**
 * 00:00 WIB dari hari yang sedang berjalan (bukan hari server).
 *
 * `startOfHariWIB(new Date("2026-10-27T22:00:00+07:00"))`
 *   -> `2026-10-26T17:00:00.000Z` (= 27 Okt 00:00 WIB)
 */
export function startOfHariWIB(now: Date = new Date()): Date {
  const { tahun, bulan, hari } = komponenWIB(now);
  return new Date(Date.UTC(tahun, bulan - 1, hari) - OFFSET_WIB_MS);
}

/** Tanggal WIB dalam format `YYYY-MM-DD` (untuk kunci harian/log). */
export function tanggalWIB(now: Date = new Date()): string {
  const { tahun, bulan, hari } = komponenWIB(now);
  return `${tahun}-${String(bulan).padStart(2, "0")}-${String(hari).padStart(2, "0")}`;
}

/** Jam WIB dari sebuah Date (`{ hour: "2-digit", minute: "2-digit" }`). */
export function jamWIB(now: Date = new Date()): string {
  const { jam, menit } = komponenWIB(now);
  return `${String(jam).padStart(2, "0")}:${String(menit).padStart(2, "0")}`;
}

/** Batas bawah jendela absensi terbuka: `now - JENDELA_ABSENSI_JAM` jam. */
export function batasAbsensiTerbuka(now: Date = new Date()): Date {
  return new Date(now.getTime() - JENDELA_ABSENSI_JAM * 60 * 60 * 1000);
}

/**
 * Sisa menit (dibulatkan ke atas, minimum 1) sebelum `mulai + windowMenit`.
 * Dipakai pesan rate limit login.
 */
export function sisaMenit(
  mulai: Date,
  windowMenit: number,
  now: Date = new Date(),
): number {
  const berakhir = mulai.getTime() + windowMenit * 60 * 1000;
  if (berakhir <= now.getTime()) return 0;
  return Math.max(1, Math.ceil((berakhir - now.getTime()) / 60_000));
}