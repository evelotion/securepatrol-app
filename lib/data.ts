import "server-only";

import QRCode from "qrcode";

import { requireRole, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MASTER_ROLES } from "@/lib/roles";
import type { CheckpointRow, DashboardStats, UserRow } from "@/lib/types";

export type { CheckpointRow, DashboardStats, UserRow };

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

/** Ringkasan dashboard — pemanggil wajib sudah terotentikasi (halaman memakai getCurrentUser). */
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
