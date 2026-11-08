import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { requireRole, type SessionUser } from "@/lib/auth";
import { awalTanggalWIB } from "@/lib/kehadiran";
import { prisma } from "@/lib/prisma";
import {
  rekapKehadiran,
  rekapPatroli,
  ringkasan,
  type AgregatAbsensi,
  type AgregatPatroli,
  type RekapKehadiranRow,
  type RekapPatroliRow,
  type RingkasanLaporan,
} from "@/lib/rekap";
import { parseRentang } from "@/lib/rentang";
import { DASHBOARD_ROLES } from "@/lib/roles";
import { whereUserDalamScope } from "@/lib/scope";
import { tambahHari } from "@/lib/shift";

export const LAPORAN_HARI_BAWAAN = 7;
export const LAPORAN_HARI_MAKS = 93;

export type LaporanFilter = {
  dari: string;
  sampai: string;
  regu: string;
  userId: string;
  error: string | null;
};

/** Baca filter dari query string; nilai tidak valid diganti bawaan. */
export function bacaFilterLaporan(sp: {
  get(name: string): string | null;
}): LaporanFilter {
  const rentang = parseRentang(
    sp.get("dari") ?? undefined,
    sp.get("sampai") ?? undefined,
    { hariBawaan: LAPORAN_HARI_BAWAAN, hariMaks: LAPORAN_HARI_MAKS },
  );
  return {
    ...rentang,
    regu: sp.get("regu")?.trim() ?? "",
    userId: sp.get("user")?.trim() ?? "",
  };
}

/**
 * Filter user untuk laporan. Cakupan dan filter digabung dengan AND (bukan
 * spread) supaya parameter `regu`/`user` dari URL tidak bisa menimpa batas
 * regu milik Danru. `hanyaSecurity=false` dipakai untuk insiden (pelapor bisa
 * siapa saja dalam cakupan).
 */
export function whereUserLaporan(
  actor: SessionUser,
  filter: LaporanFilter,
  hanyaSecurity = true,
): Prisma.UserWhereInput {
  return {
    AND: [
      whereUserDalamScope(actor),
      ...(hanyaSecurity ? [{ role: "SECURITY" as const }] : []),
      ...(filter.regu ? [{ regu: filter.regu }] : []),
      ...(filter.userId ? [{ id: filter.userId }] : []),
    ],
  };
}

export type Laporan = {
  actor: SessionUser;
  filter: LaporanFilter;
  kehadiran: RekapKehadiranRow[];
  patroli: RekapPatroliRow[];
  ringkasan: RingkasanLaporan;
  totalTitikAktif: number;
  opsiRegu: string[];
  opsiUser: { id: string; nama: string }[];
};

/**
 * Rekap untuk rentang & filter. Selalu dibatasi cakupan role di server:
 * Danru hanya regunya sendiri, apa pun parameter `regu`/`user` yang dikirim.
 */
export async function getLaporan(filter: LaporanFilter): Promise<Laporan> {
  const actor = await requireRole(DASHBOARD_ROLES);

  const cakupan = whereUserDalamScope(actor);
  const whereUser = whereUserLaporan(actor, filter);

  const awal = awalTanggalWIB(filter.dari);
  const akhir = awalTanggalWIB(tambahHari(filter.sampai, 1));

  const [orangRows, opsiUserRows, totalTitikAktif, absensiG, patroliG] =
    await Promise.all([
      prisma.user.findMany({
        where: whereUser,
        select: { id: true, nama: true, regu: true, aktif: true },
      }),
      // Daftar pilihan filter: semua Security dalam cakupan (tanpa filter regu/user).
      prisma.user.findMany({
        where: { ...cakupan, role: "SECURITY", aktif: true },
        orderBy: [{ regu: "asc" }, { nama: "asc" }],
        select: { id: true, nama: true, regu: true },
      }),
      prisma.checkpoint.count({ where: { aktif: true } }),
      prisma.absensi.groupBy({
        by: ["userId", "statusHadir"],
        where: { waktuMasuk: { gte: awal, lt: akhir }, user: whereUser },
        _count: { _all: true },
      }),
      prisma.patroliLog.groupBy({
        by: ["userId", "checkpointId", "status"],
        where: { waktu: { gte: awal, lt: akhir }, user: whereUser },
        _count: { _all: true },
      }),
    ]);

  const agregatAbsensi: AgregatAbsensi[] = absensiG.map((g) => ({
    userId: g.userId,
    statusHadir: g.statusHadir,
    jumlah: g._count._all,
  }));
  const agregatPatroli: AgregatPatroli[] = patroliG.map((g) => ({
    userId: g.userId,
    checkpointId: g.checkpointId,
    status: g.status,
    jumlah: g._count._all,
  }));

  // User nonaktif tanpa aktivitas dalam rentang tidak perlu tampil.
  const aktivitas = new Set([
    ...agregatAbsensi.map((a) => a.userId),
    ...agregatPatroli.map((a) => a.userId),
  ]);
  const orang = orangRows
    .filter((o) => o.aktif || aktivitas.has(o.id))
    .map(({ id, nama, regu }) => ({ id, nama, regu }));

  const kehadiran = rekapKehadiran(orang, agregatAbsensi);
  const patroli = rekapPatroli(orang, agregatPatroli, totalTitikAktif);

  return {
    actor,
    filter,
    kehadiran,
    patroli,
    ringkasan: ringkasan(kehadiran, patroli, agregatPatroli, totalTitikAktif),
    totalTitikAktif,
    opsiRegu: [
      ...new Set(
        opsiUserRows.flatMap((u) => (u.regu ? [u.regu] : [])),
      ),
    ],
    opsiUser: opsiUserRows.map((u) => ({ id: u.id, nama: u.nama })),
  };
}
