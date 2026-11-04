import "server-only";

import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { jendelaShift, tanggalDB } from "@/lib/shift";

/**
 * F4-2 — tandai jadwal yang tidak punya absensi sebagai TIDAK_HADIR.
 *
 * Dipanggil cron harian setelah shift terakhir selesai. Baris Absensi dibuat
 * dengan waktuKeluar terisi supaya tidak dianggap "absensi terbuka" dan tidak
 * memblokir absen masuk berikutnya (indeks `absensi_satu_terbuka`).
 */
export async function tandaiTidakHadir(
  tanggal: string,
): Promise<{ diperiksa: number; ditandai: number }> {
  const jadwal = await prisma.jadwal.findMany({
    where: { aktif: true, tanggal: tanggalDB(tanggal) },
    include: {
      shift: {
        select: {
          id: true,
          nama: true,
          jamMulai: true,
          jamSelesai: true,
          toleransiTelatMenit: true,
        },
      },
    },
  });

  let ditandai = 0;
  const sekarang = Date.now();

  for (const row of jadwal) {
    const jendela = jendelaShift(tanggal, row.shift);
    // Shift yang belum selesai belum bisa dinilai tidak hadir.
    if (!jendela || jendela.selesai.getTime() > sekarang) continue;

    const absensi = await prisma.absensi.findFirst({
      where: {
        userId: row.userId,
        waktuMasuk: { gte: jendela.mulai, lt: jendela.selesai },
      },
      select: { id: true },
    });
    if (absensi) continue;

    const created = await prisma.absensi.create({
      data: {
        userId: row.userId,
        shiftId: row.shiftId,
        waktuMasuk: jendela.mulai,
        waktuKeluar: jendela.selesai,
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
        userId: row.userId,
        tanggal,
        shiftId: row.shiftId,
        shiftNama: row.shift.nama,
        statusHadir: "TIDAK_HADIR",
      },
    });

    ditandai += 1;
  }

  return { diperiksa: jadwal.length, ditandai };
}
