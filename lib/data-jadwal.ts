import "server-only";

import { requireRole, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkpointTerlewat, hitungPutaran, putaranBerjalan } from "@/lib/rute";
import { FIELD_ROLES, JADWAL_ROLES, MASTER_ROLES } from "@/lib/roles";
import {
  awalPekan,
  hariPekan,
  jendelaShift,
  tanggalDB,
  tanggalDariDB,
} from "@/lib/shift";
import { startOfHariWIB, tanggalWIB } from "@/lib/waktu";
import type {
  JadwalMingguan,
  JadwalSaya,
  RuteHariIni,
  RuteRow,
  ShiftRow,
} from "@/lib/types";

/** Data Shift, Jadwal, dan Rute untuk halaman F4-2/F4-3. */

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

function toShiftRow(row: {
  id: string;
  nama: string;
  jamMulai: string;
  jamSelesai: string;
  toleransiTelatMenit: number;
  aktif: boolean;
}): ShiftRow {
  return {
    id: row.id,
    nama: row.nama,
    jamMulai: row.jamMulai,
    jamSelesai: row.jamSelesai,
    toleransiTelatMenit: row.toleransiTelatMenit,
    aktif: row.aktif,
  };
}

/** Semua shift (SUPER_ADMIN) untuk halaman master. */
export async function listShifts(): Promise<ShiftRow[]> {
  await requireRole(MASTER_ROLES);

  const rows = await prisma.shift.findMany({ orderBy: { jamMulai: "asc" } });
  return rows.map(toShiftRow);
}

/** Daftar checkpoint ringkas untuk memilih titik rute (SUPER_ADMIN). */
export async function listCheckpointPilihan(): Promise<
  { id: string; namaTitik: string; aktif: boolean }[]
> {
  await requireRole(MASTER_ROLES);

  return prisma.checkpoint.findMany({
    orderBy: { namaTitik: "asc" },
    select: { id: true, namaTitik: true, aktif: true },
  });
}

/** Semua rute beserta titiknya (SUPER_ADMIN). */
export async function listRute(): Promise<RuteRow[]> {
  await requireRole(MASTER_ROLES);

  const rows = await prisma.rute.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      shift: { select: { nama: true } },
      titik: {
        orderBy: { urutan: "asc" },
        include: { checkpoint: { select: { namaTitik: true } } },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    nama: row.nama,
    shiftId: row.shiftId,
    shiftNama: row.shift?.nama ?? null,
    targetPutaran: row.targetPutaran,
    intervalMenit: row.intervalMenit,
    aktif: row.aktif,
    titik: row.titik.map((t) => ({
      checkpointId: t.checkpointId,
      namaTitik: t.checkpoint.namaTitik,
      urutan: t.urutan,
      minDetikDariSebelumnya: t.minDetikDariSebelumnya,
    })),
  }));
}

/**
 * Kalender jadwal satu pekan.
 * Danru hanya melihat/mengatur regunya sendiri; Chief & Admin semua regu.
 */
export async function getJadwalPekan(tanggalAcuan?: string): Promise<{
  actor: SessionUser;
  data: JadwalMingguan;
}> {
  const actor = await requireRole(JADWAL_ROLES);

  const acuan =
    tanggalAcuan && POLA_TANGGAL.test(tanggalAcuan) ? tanggalAcuan : tanggalWIB();
  const pekan = awalPekan(acuan);
  const hari = hariPekan(pekan);
  const danru = actor.role === "DANRU";

  const users = await prisma.user.findMany({
    where: {
      aktif: true,
      role: { in: ["SECURITY", "DANRU", "CHIEF_SECURITY"] },
      ...(danru
        ? actor.regu
          ? { regu: actor.regu }
          : { id: actor.id }
        : {}),
    },
    orderBy: [{ regu: "asc" }, { nama: "asc" }],
    select: { id: true, nama: true, regu: true, role: true },
  });

  const [shifts, jadwalRows] = await Promise.all([
    prisma.shift.findMany({
      where: { aktif: true },
      orderBy: { jamMulai: "asc" },
    }),
    users.length === 0
      ? Promise.resolve([])
      : prisma.jadwal.findMany({
          where: {
            aktif: true,
            userId: { in: users.map((u) => u.id) },
            tanggal: {
              gte: tanggalDB(hari[0]),
              lte: tanggalDB(hari[6]),
            },
          },
          include: { shift: { select: { nama: true } } },
        }),
  ]);

  return {
    actor,
    data: {
      pekan,
      hari,
      shifts: shifts.map(toShiftRow),
      users,
      jadwal: jadwalRows.map((row) => ({
        userId: row.userId,
        tanggal: tanggalDariDB(row.tanggal),
        shiftId: row.shiftId,
        shiftNama: row.shift.nama,
      })),
      bisaAtur: true,
      reguScope: danru ? (actor.regu ?? "—") : null,
    },
  };
}

/** Jadwal shift staf untuk hari ini — kartu di beranda. */
export async function getJadwalSaya(
  now?: Date,
): Promise<{ actor: SessionUser; jadwal: JadwalSaya | null }> {
  const actor = await requireRole(FIELD_ROLES);
  // Dibaca setelah sesi tervalidasi agar tidak dieksekusi saat prerender.
  const sekarang = now ?? new Date();
  const tanggal = tanggalWIB(sekarang);

  const row = await prisma.jadwal.findUnique({
    where: {
      userId_tanggal: { userId: actor.id, tanggal: tanggalDB(tanggal) },
    },
    include: { shift: true },
  });

  if (!row || !row.aktif || !row.shift.aktif) return { actor, jadwal: null };

  return {
    actor,
    jadwal: {
      tanggal,
      shiftId: row.shiftId,
      shiftNama: row.shift.nama,
      jamMulai: row.shift.jamMulai,
      jamSelesai: row.shift.jamSelesai,
    },
  };
}

async function ambilRuteHariIni(shiftId: string) {
  const sertakan = {
    titik: {
      orderBy: { urutan: "asc" as const },
      include: { checkpoint: { select: { namaTitik: true, aktif: true } } },
    },
  };

  const khusus = await prisma.rute.findFirst({
    where: { aktif: true, shiftId },
    include: sertakan,
  });
  if (khusus) return khusus;

  return prisma.rute.findFirst({
    where: { aktif: true, shiftId: null },
    include: sertakan,
  });
}

/**
 * Progres rute + putaran untuk satu staf hari ini.
 * Null bila staf tidak punya jadwal, shift nonaktif, atau belum ada rute.
 */
export async function getRuteHariIni(
  userId: string,
  now?: Date,
): Promise<RuteHariIni | null> {
  const sekarang = now ?? new Date();
  const tanggal = tanggalWIB(sekarang);

  const jadwal = await prisma.jadwal.findUnique({
    where: { userId_tanggal: { userId, tanggal: tanggalDB(tanggal) } },
    include: { shift: true },
  });
  if (!jadwal?.aktif || !jadwal.shift.aktif) return null;

  const rute = await ambilRuteHariIni(jadwal.shiftId);
  if (!rute) return null;

  const titik = rute.titik
    .filter((t) => t.checkpoint.aktif)
    .map((t) => ({
      checkpointId: t.checkpointId,
      namaTitik: t.checkpoint.namaTitik,
      urutan: t.urutan,
    }));
  if (titik.length === 0) return null;

  const logs = await prisma.patroliLog.findMany({
    where: { userId, waktu: { gte: startOfHariWIB(sekarang) } },
    select: { checkpointId: true, waktu: true },
  });

  const putaran = hitungPutaran({
    rute,
    shift: jadwal.shift,
    tanggal,
    titik,
    logs,
    sekarang,
  });

  return {
    nama: rute.nama,
    shiftNama: jadwal.shift.nama,
    jamMulai: jadwal.shift.jamMulai,
    jamSelesai: jadwal.shift.jamSelesai,
    putaran: putaran.map((p) => ({
      putaran: p.putaran,
      mulai: p.mulai.toISOString(),
      selesai: p.selesai.toISOString(),
      status: p.status,
      total: p.total,
      dikunjungi: p.dikunjungi,
      terlewat: p.terlewat,
      titik: p.titik.map((t) => ({
        checkpointId: t.checkpointId,
        namaTitik: t.namaTitik,
        urutan: t.urutan,
        status: t.status,
        waktu: t.waktu?.toISOString() ?? null,
      })),
    })),
  };
}

/**
 * Anti titik palsu: konteks waktu tempuh untuk satu scan. Mengembalikan batas
 * minimum (detik) titik ini pada rute aktif staf dan jendela putaran yang
 * sedang berjalan, atau null bila staf tak punya jadwal/rute, titik tidak ada
 * di rute, atau sedang di luar putaran (aturan tidak berlaku).
 */
export async function getKonteksWaktuTempuh(
  userId: string,
  checkpointId: string,
  now: Date,
): Promise<{ minDetik: number; mulai: Date; selesai: Date } | null> {
  const tanggal = tanggalWIB(now);
  const jadwal = await prisma.jadwal.findUnique({
    where: { userId_tanggal: { userId, tanggal: tanggalDB(tanggal) } },
    include: { shift: true },
  });
  if (!jadwal?.aktif || !jadwal.shift.aktif) return null;

  const rute = await ambilRuteHariIni(jadwal.shiftId);
  const titik = rute?.titik.find((t) => t.checkpointId === checkpointId);
  if (!rute || !titik) return null;

  const putaran = putaranBerjalan({
    rute,
    shift: jadwal.shift,
    tanggal,
    sekarang: now,
  });
  if (!putaran) return null;

  return {
    minDetik: titik.minDetikDariSebelumnya,
    mulai: putaran.mulai,
    selesai: putaran.selesai,
  };
}

/**
 * Checkpoint yang jendela putarannya sudah lewat tanpa dipindai hari ini.
 * Dipakai dashboard untuk menandai titik merah (TERLEWAT).
 */
export async function getCheckpointTerlewatHariIni(
  now?: Date,
): Promise<Set<string>> {
  const sekarang = now ?? new Date();
  const tanggal = tanggalWIB(sekarang);
  const ruteRows = await prisma.rute.findMany({
    where: { aktif: true, shiftId: { not: null } },
    include: {
      shift: true,
      titik: { orderBy: { urutan: "asc" } },
    },
  });
  if (ruteRows.length === 0) return new Set<string>();

  const logs = await prisma.patroliLog.findMany({
    where: { waktu: { gte: startOfHariWIB(sekarang) } },
    select: { checkpointId: true, waktu: true },
  });

  const hasil = new Set<string>();
  for (const rute of ruteRows) {
    if (!rute.shift || !jendelaShift(tanggal, rute.shift)) continue;

    const putaran = hitungPutaran({
      rute,
      shift: rute.shift,
      tanggal,
      titik: rute.titik.map((t) => ({
        checkpointId: t.checkpointId,
        namaTitik: "",
        urutan: t.urutan,
      })),
      logs,
      sekarang,
    });

    for (const id of checkpointTerlewat(putaran)) hasil.add(id);
  }

  return hasil;
}
