import "server-only";

import { requireRole } from "@/lib/auth";
import { whereUserLaporan, type LaporanFilter } from "@/lib/data-laporan";
import { awalTanggalWIB } from "@/lib/kehadiran";
import { rekapMencurigakan, type PetugasMencurigakan } from "@/lib/mencurigakan";
import { prisma } from "@/lib/prisma";
import { DASHBOARD_ROLES } from "@/lib/roles";
import { tambahHari } from "@/lib/shift";

/** Batas baris yang dibaca agar panel tetap ringan pada periode panjang. */
const BATAS_BARIS = 2_000;

export type ScanMencurigakan = {
  dari: string;
  sampai: string;
  petugas: PetugasMencurigakan[];
  /** True bila hasil dipotong BATAS_BARIS. */
  terpotong: boolean;
};

/**
 * Petugas dengan scan TIDAK_VALID (termasuk "terlalu cepat") pada rentang.
 * Hanya manager; cakupan regu dari `whereUserLaporan` (Danru = regunya saja,
 * apa pun parameter regu/user dari URL).
 */
export async function getScanMencurigakan(
  filter: Pick<LaporanFilter, "dari" | "sampai" | "regu" | "userId">,
): Promise<ScanMencurigakan> {
  const actor = await requireRole(DASHBOARD_ROLES);

  const rows = await prisma.patroliLog.findMany({
    where: {
      status: "TIDAK_VALID",
      waktu: {
        gte: awalTanggalWIB(filter.dari),
        lt: awalTanggalWIB(tambahHari(filter.sampai, 1)),
      },
      user: whereUserLaporan(actor, { ...filter, error: null }),
    },
    orderBy: { waktu: "desc" },
    take: BATAS_BARIS + 1,
    select: {
      id: true,
      userId: true,
      waktu: true,
      alasan: true,
      jarakM: true,
      user: { select: { nama: true, regu: true } },
      checkpoint: { select: { namaTitik: true } },
    },
  });

  const terpotong = rows.length > BATAS_BARIS;
  const petugas = rekapMencurigakan(
    rows.slice(0, BATAS_BARIS).map((r) => ({
      id: r.id,
      userId: r.userId,
      nama: r.user.nama,
      regu: r.user.regu,
      waktu: r.waktu,
      namaTitik: r.checkpoint.namaTitik,
      alasan: r.alasan,
      jarakM: r.jarakM,
    })),
  );

  return { dari: filter.dari, sampai: filter.sampai, petugas, terpotong };
}
