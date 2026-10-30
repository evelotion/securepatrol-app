import "server-only";

import QRCode from "qrcode";

import { getCurrentUser, requireRole, type SessionUser } from "@/lib/auth";
import { isCloudinaryKeyForUser } from "@/lib/cloudinary";
import { isLegacyFoto } from "@/lib/foto";
import { prisma } from "@/lib/prisma";
import { DASHBOARD_ROLES, FIELD_ROLES, MASTER_ROLES } from "@/lib/roles";
import { batasAbsensiTerbuka, startOfHariWIB } from "@/lib/waktu";
import type {
  AbsensiHariIni,
  AbsensiRow,
  CheckpointProgress,
  CheckpointRow,
  DashboardHariIni,
  DashboardStats,
  PatroliLogRow,
  UserRow,
} from "@/lib/types";

export type { CheckpointRow, DashboardStats, UserRow };

/* ------------------------------------------------------------------ */
/* Blok 4 — Absensi milik sendiri                                      */
/* ------------------------------------------------------------------ */

/**
 * Absensi hari ini milik staf yang login. Foto private hanya ditampilkan ke pemilik.
 * URL bertanda tangan Cloudinary berlaku selama sepuluh menit.
 */
export async function getAbsensiSaya(): Promise<{
  actor: SessionUser;
  absensi: AbsensiHariIni | null;
}> {
  const actor = await requireRole(FIELD_ROLES);

  const row = await prisma.absensi.findFirst({
    where: {
      userId: actor.id,
      // Absensi terbuka dalam 16 jam terakhir tetap tampil setelah tengah malam,
      // supaya tombol Absen Keluar tetap aktif untuk shift malam (F1-1).
      OR: [
        { waktuKeluar: null, waktuMasuk: { gte: batasAbsensiTerbuka() } },
        { waktuMasuk: { gte: startOfHariWIB() } },
      ],
    },
    orderBy: { waktuMasuk: "desc" },
  });

  if (!row) return { actor, absensi: null };

  const [fotoMasukUrl, fotoKeluarUrl] = await Promise.all([
    resolveFotoUrl(row.fotoMasuk, actor.id),
    resolveFotoUrl(row.fotoKeluar, actor.id),
  ]);

  return {
    actor,
    absensi: {
      id: row.id,
      waktuMasuk: row.waktuMasuk.toISOString(),
      waktuKeluar: row.waktuKeluar?.toISOString() ?? null,
      latMasuk: row.latMasuk?.toString() ?? null,
      longMasuk: row.longMasuk?.toString() ?? null,
      latKeluar: row.latKeluar?.toString() ?? null,
      longKeluar: row.longKeluar?.toString() ?? null,
      fotoMasuk: row.fotoMasuk,
      fotoKeluar: row.fotoKeluar,
      fotoMasukUrl,
      fotoKeluarUrl,
    },
  };
}

async function resolveFotoUrl(key: string | null, userId: string): Promise<string | null> {
  if (!key) return null;
  if (isLegacyFoto(key)) return key;
  if (!isCloudinaryKeyForUser(key, userId)) return null;
  const foto = await prisma.foto.findUnique({
    where: { key },
    select: { id: true, userId: true },
  });
  if (!foto || foto.userId !== userId) return null;
  return `/api/foto/${foto.id}`;
}

/* ------------------------------------------------------------------ */
/* Blok 5 — Rute & log patroli                                         */
/* ------------------------------------------------------------------ */

type LogRow = {
  id: string;
  waktu: Date;
  status: "VALID" | "TIDAK_VALID" | "BELUM_TERVERIFIKASI";
  alasan: string | null;
  jarakM: number | null;
  akurasiM: number | null;
  user: { nama: string };
  checkpoint: { id: string; namaTitik: string };
};

/** Susun progres tiap checkpoint dari daftar log (urut terbaru dulu). */
function buildProgress(
  checkpoints: {
    id: string;
    namaTitik: string;
    kodeBarcode: string;
    lat: { toString(): string } | null;
    long: { toString(): string } | null;
    aktif: boolean;
  }[],
  logs: LogRow[],
): CheckpointProgress[] {
  return checkpoints.map((cp) => {
    const visits = logs.filter((log) => log.checkpoint.id === cp.id);
    const last = visits[0];

    return {
      id: cp.id,
      namaTitik: cp.namaTitik,
      kodeBarcode: cp.kodeBarcode,
      lat: cp.lat?.toString() ?? null,
      long: cp.long?.toString() ?? null,
      aktif: cp.aktif,
      dikunjungi: visits.length > 0,
      kunjunganTerakhir: last ? last.waktu.toISOString() : null,
      pengunjung: last ? last.user.nama : null,
      jumlahValid: visits.filter((v) => v.status === "VALID").length,
      jumlahTidakValid: visits.filter((v) => v.status === "TIDAK_VALID").length,
      jumlahBelumTerverifikasi: visits.filter(
        (v) => v.status === "BELUM_TERVERIFIKASI",
      ).length,
      statusTerakhir: last?.status ?? null,
      alasanTerakhir: last?.alasan ?? null,
    };
  });
}

function toLogRow(log: LogRow): PatroliLogRow {
  return {
    id: log.id,
    waktu: log.waktu.toISOString(),
    namaUser: log.user.nama,
    namaCheckpoint: log.checkpoint.namaTitik,
    status: log.status,
    alasan: log.alasan,
    jarakM: log.jarakM,
    akurasiM: log.akurasiM,
  };
}

/**
 * Rute patroli + log hari ini milik staf yang login — halaman /patroli.
 */
export async function getPatroliSaya(): Promise<{
  actor: SessionUser;
  data: {
    checkpoints: CheckpointProgress[];
    logs: PatroliLogRow[];
  };
}> {
  const actor = await requireRole(FIELD_ROLES);
  const hariIni = startOfHariWIB();

  const [checkpoints, logs] = await Promise.all([
    prisma.checkpoint.findMany({
      where: { aktif: true },
      orderBy: { namaTitik: "asc" },
    }),
    prisma.patroliLog.findMany({
      where: { userId: actor.id, waktu: { gte: hariIni } },
      orderBy: { waktu: "desc" },
      select: {
        id: true,
        waktu: true,
        status: true,
        alasan: true,
        jarakM: true,
        akurasiM: true,
        user: { select: { nama: true } },
        checkpoint: { select: { id: true, namaTitik: true } },
      },
    }),
  ]);

  return {
    actor,
    data: {
      checkpoints: buildProgress(checkpoints, logs),
      logs: logs.map(toLogRow),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Blok 6 — Dashboard pemantauan                                      */
/* ------------------------------------------------------------------ */

/**
 * Ringkasan hari ini untuk dashboard.
 *
 * - Manager (DANRU/CHIEF/SUPER_ADMIN) -> seluruh tim (`scope: "tim"`).
 * - SECURITY                          -> datanya sendiri (`scope: "pribadi"`).
 */
export async function getDashboardHariIni(): Promise<{
  actor: SessionUser;
  scope: "pribadi" | "tim";
  data: DashboardHariIni;
  stats: DashboardStats | null;
}> {
  const actor = await getCurrentUser();
  const scope = DASHBOARD_ROLES.includes(actor.role) ? "tim" : "pribadi";
  const hanyaMilikSaya = scope === "pribadi" ? actor.id : undefined;
  const hariIni = startOfHariWIB();

  const [absensiRows, checkpoints, logRows, stats] = await Promise.all([
    prisma.absensi.findMany({
      where: {
        waktuMasuk: { gte: hariIni },
        ...(hanyaMilikSaya ? { userId: hanyaMilikSaya } : {}),
      },
      orderBy: { waktuMasuk: "desc" },
      select: {
        userId: true,
        waktuMasuk: true,
        waktuKeluar: true,
        user: { select: { nama: true, regu: true, role: true } },
      },
    }),
    prisma.checkpoint.findMany({
      where: { aktif: true },
      orderBy: { namaTitik: "asc" },
    }),
    prisma.patroliLog.findMany({
      where: {
        waktu: { gte: hariIni },
        ...(hanyaMilikSaya ? { userId: hanyaMilikSaya } : {}),
      },
      orderBy: { waktu: "desc" },
      select: {
        id: true,
        waktu: true,
        status: true,
        alasan: true,
        jarakM: true,
        akurasiM: true,
        user: { select: { nama: true } },
        checkpoint: { select: { id: true, namaTitik: true } },
      },
    }),
    scope === "tim" && actor.role === "SUPER_ADMIN"
      ? getDashboardStats()
      : Promise.resolve(null),
  ]);

  const absensi: AbsensiRow[] = absensiRows.map((row) => ({
    userId: row.userId,
    nama: row.user.nama,
    regu: row.user.regu,
    role: row.user.role,
    waktuMasuk: row.waktuMasuk.toISOString(),
    waktuKeluar: row.waktuKeluar?.toISOString() ?? null,
  }));

  const progress = buildProgress(checkpoints, logRows);
  const totalTerpatroli = progress.filter((cp) => cp.dikunjungi).length;
  const logValid = logRows.filter((log) => log.status === "VALID").length;
  const logTidakValid = logRows.filter(
    (log) => log.status === "TIDAK_VALID",
  ).length;
  const logBelumTerverifikasi = logRows.filter(
    (log) => log.status === "BELUM_TERVERIFIKASI",
  ).length;

  return {
    actor,
    scope,
    stats,
    data: {
      summary: {
        totalHadir: absensi.length,
        sedangBertugas: absensi.filter((a) => a.waktuKeluar === null).length,
        sudahPulang: absensi.filter((a) => a.waktuKeluar !== null).length,
        totalCheckpointAktif: progress.length,
        checkpointTerpatroli: totalTerpatroli,
        logHariIni: logRows.length,
        logValid,
        logInvalid: logTidakValid,
        logBelumTerverifikasi,
      },
      absensi,
      checkpoints: progress,
      logs: logRows.slice(0, 12).map(toLogRow),
    },
  };
}

async function toQrSvg(kode: string): Promise<string> {
  return QRCode.toString(kode, {
    type: "svg",
    margin: 1,
    width: 256,
    errorCorrectionLevel: "M",
  });
}

/* Daftar semua user — hanya SUPER_ADMIN. Mengembalikan actor untuk guard UI. */
export async function listUsers(): Promise<{
  actor: SessionUser;
  users: UserRow[];
}> {
  const actor = await requireRole(MASTER_ROLES);

  const rows = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  const users = rows.map((u) => ({
    id: u.id,
    nama: u.nama,
    email: u.email,
    username: u.username,
    role: u.role,
    regu: u.regu,
    aktif: u.aktif,
    createdAt: u.createdAt.toISOString(),
  }));

  return { actor, users };
}

/** Daftar semua checkpoint + QR siap cetak — hanya SUPER_ADMIN. */
export async function listCheckpoints(): Promise<CheckpointRow[]> {
  await requireRole(MASTER_ROLES);

  const rows = await prisma.checkpoint.findMany({
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    rows.map(async (c) => ({
      id: c.id,
      namaTitik: c.namaTitik,
      kodeBarcode: c.kodeBarcode,
      lat: c.lat === null ? null : c.lat.toString(),
      long: c.long === null ? null : c.long.toString(),
      keterangan: c.keterangan,
      aktif: c.aktif,
      qrSvg: await toQrSvg(c.kodeBarcode),
    })),
  );
}

/**
 * Jumlah user & checkpoint (kartu master data, SUPER_ADMIN).
 * Pemanggil wajib sudah terotentikasi — halaman memakai getCurrentUser.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [totalUser, userAktif, totalCheckpoint, checkpointAktif] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { aktif: true } }),
      prisma.checkpoint.count(),
      prisma.checkpoint.count({ where: { aktif: true } }),
    ]);

  return { totalUser, userAktif, totalCheckpoint, checkpointAktif };
}
