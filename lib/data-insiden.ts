import "server-only";

import { requireRole, type SessionUser } from "@/lib/auth";
import type { InsidenRow } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { DASHBOARD_ROLES, FIELD_ROLES } from "@/lib/roles";
import { whereUserDalamScope } from "@/lib/scope";
import type { StatusInsiden } from "@/lib/insiden";

const SELECT_INSIDEN = {
  id: true,
  kategori: true,
  prioritas: true,
  deskripsi: true,
  fotoKeys: true,
  lat: true,
  long: true,
  akurasiM: true,
  status: true,
  ditanganiPada: true,
  catatanTindakLanjut: true,
  createdAt: true,
  user: { select: { nama: true, regu: true } },
  penangan: { select: { nama: true } },
  checkpoint: { select: { namaTitik: true } },
} as const;

type InsidenRecord = Awaited<
  ReturnType<typeof prisma.insiden.findMany<{ select: typeof SELECT_INSIDEN }>>
>[number];

/** Id Foto untuk daftar key — dipakai thumbnail lewat /api/foto/[id]. */
async function petaFotoId(keys: string[]): Promise<Map<string, string>> {
  if (keys.length === 0) return new Map();
  const fotos = await prisma.foto.findMany({
    where: { key: { in: keys } },
    select: { id: true, key: true },
  });
  return new Map(fotos.map((f) => [f.key, f.id]));
}

async function keRows(records: InsidenRecord[]): Promise<InsidenRow[]> {
  const peta = await petaFotoId(records.flatMap((r) => r.fotoKeys));

  return records.map((r) => ({
    id: r.id,
    kategori: r.kategori,
    prioritas: r.prioritas,
    deskripsi: r.deskripsi,
    fotoIds: r.fotoKeys.flatMap((key) => {
      const id = peta.get(key);
      return id ? [id] : [];
    }),
    // Decimal -> string sebelum ke client component (aturan CLAUDE.md).
    lat: r.lat?.toString() ?? null,
    long: r.long?.toString() ?? null,
    akurasiM: r.akurasiM,
    status: r.status,
    namaPelapor: r.user.nama,
    reguPelapor: r.user.regu,
    namaTitik: r.checkpoint?.namaTitik ?? null,
    namaPenangan: r.penangan?.nama ?? null,
    ditanganiPada: r.ditanganiPada?.toISOString() ?? null,
    catatanTindakLanjut: r.catatanTindakLanjut,
    dibuatPada: r.createdAt.toISOString(),
  }));
}

/** Insiden milik staf yang login (tab Insiden SECURITY). */
export async function getInsidenSaya(): Promise<{
  actor: SessionUser;
  insiden: InsidenRow[];
  checkpoints: { id: string; namaTitik: string }[];
}> {
  const actor = await requireRole(FIELD_ROLES);

  const [records, checkpoints] = await Promise.all([
    prisma.insiden.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: SELECT_INSIDEN,
    }),
    prisma.checkpoint.findMany({
      where: { aktif: true },
      orderBy: { namaTitik: "asc" },
      select: { id: true, namaTitik: true },
    }),
  ]);

  return { actor, insiden: await keRows(records), checkpoints };
}

/** Insiden dalam cakupan manager (Danru = regunya; Chief/Admin = semua). */
export async function getInsidenTim(
  status?: StatusInsiden,
): Promise<{ actor: SessionUser; insiden: InsidenRow[] }> {
  const actor = await requireRole(DASHBOARD_ROLES);

  const records = await prisma.insiden.findMany({
    where: {
      user: whereUserDalamScope(actor),
      ...(status ? { status } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
    select: SELECT_INSIDEN,
  });

  return { actor, insiden: await keRows(records) };
}

/** Sinyal darurat yang belum ditangani, dalam cakupan manager — banner dashboard. */
export async function getDaruratAktif(actor: SessionUser): Promise<InsidenRow[]> {
  if (!DASHBOARD_ROLES.includes(actor.role)) return [];

  const records = await prisma.insiden.findMany({
    where: {
      prioritas: "DARURAT",
      status: "BARU",
      user: whereUserDalamScope(actor),
    },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: SELECT_INSIDEN,
  });

  return keRows(records);
}
