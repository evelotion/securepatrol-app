import "server-only";

import { writeAudit } from "@/lib/audit";
import {
  nilaiTidakHadir,
  rentangKueriAbsensi,
  type AbsensiCocok,
  type JadwalPenilaian,
} from "@/lib/kehadiran";
import { prisma } from "@/lib/prisma";
import { tanggalDB } from "@/lib/shift";

/**
 * F4-2 — tandai jadwal yang tidak punya absensi sebagai TIDAK_HADIR.
 *
 * Keputusan "hadir / tidak hadir" dihitung oleh `nilaiTidakHadir` di
 * `lib/kehadiran.ts` (murni, teruji tanpa DB). Baris Absensi dibuat dengan
 * waktuKeluar terisi supaya tidak dianggap "absensi terbuka" dan tidak
 * memblokir absen masuk berikutnya (indeks `absensi_satu_terbuka`).
 *
 * Idempoten: baris TIDAK_HADIR yang sudah ada ikut terambil sebagai absensi,
 * jadi pemanggilan ulang pada tanggal yang sama tidak membuat baris ganda.
 */
export async function tandaiTidakHadir(
  tanggal: string,
): Promise<{ diperiksa: number; ditandai: number }> {
  const jadwal = await prisma.jadwal.findMany({
    where: { aktif: true, tanggal: tanggalDB(tanggal) },
    include: { shift: true },
  });

  if (jadwal.length === 0) return { diperiksa: 0, ditandai: 0 };

  // Absensi yang mungkin cocok: 00:00 WIB tanggal jadwal sampai dua hari
  // setelahnya (shift malam paling lambat selesai 06:00 besoknya).
  const absensi: AbsensiCocok[] = await prisma.absensi.findMany({
    where: {
      userId: { in: [...new Set(jadwal.map((row) => row.userId))] },
      // Batas bawah memuat toleransi check-in lebih awal (lihat rentangKueriAbsensi).
      waktuMasuk: rentangKueriAbsensi(tanggal),
    },
    select: {
      userId: true,
      waktuMasuk: true,
      shiftId: true,
      statusHadir: true,
    },
  });

  const keputusan = nilaiTidakHadir(
    tanggal,
    jadwal.map<JadwalPenilaian>((row) => ({
      jadwalId: row.id,
      userId: row.userId,
      shiftId: row.shiftId,
      shift: row.shift,
    })),
    absensi,
    new Date(),
  );

  let ditandai = 0;
  for (const baris of keputusan) {
    if (baris.alasan !== "DITANDAI") continue;

    const created = await prisma.absensi.create({
      data: {
        userId: baris.jadwal.userId,
        shiftId: baris.jadwal.shiftId,
        waktuMasuk: baris.jendela.mulai,
        waktuKeluar: baris.jendela.selesai,
        statusHadir: "TIDAK_HADIR",
      },
      select: { id: true },
    });

    await writeAudit({
      userId: null,
      aksi: "ABSENSI_TIDAK_HADIR",
      tabel: "Absensi",
      dataBaru: {
        id: created.id,
        userId: baris.jadwal.userId,
        tanggal,
        shiftId: baris.jadwal.shiftId,
        shiftNama: baris.jadwal.shift.nama,
        statusHadir: "TIDAK_HADIR",
      },
    });

    ditandai += 1;
  }

  return { diperiksa: jadwal.length, ditandai };
}
