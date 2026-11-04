import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MASTER_ROLES } from "@/lib/roles";
import { awalTanggalWIB } from "@/lib/kehadiran";
import { tambahHari } from "@/lib/shift";

export const AUDIT_PER_HALAMAN = 50;

export type AuditFilter = {
  aksi: string;
  tabel: string;
  user: string;
  dari: string | null;
  sampai: string | null;
  halaman: number;
};

export type AuditRow = {
  id: string;
  waktu: string;
  aksi: string;
  tabel: string;
  namaUser: string | null;
  dataLama: unknown;
  dataBaru: unknown;
};

/** Daftar audit log (hanya SUPER_ADMIN) dengan filter dan pagination. */
export async function listAudit(filter: AuditFilter): Promise<{
  rows: AuditRow[];
  total: number;
  tabelOpsi: string[];
}> {
  await requireRole(MASTER_ROLES);

  const where: Prisma.AuditLogWhereInput = {
    ...(filter.aksi ? { aksi: { contains: filter.aksi, mode: "insensitive" } } : {}),
    ...(filter.tabel ? { tabel: filter.tabel } : {}),
    ...(filter.user
      ? {
          user: {
            OR: [
              { nama: { contains: filter.user, mode: "insensitive" } },
              { email: { contains: filter.user, mode: "insensitive" } },
            ],
          },
        }
      : {}),
    ...(filter.dari || filter.sampai
      ? {
          waktu: {
            ...(filter.dari ? { gte: awalTanggalWIB(filter.dari) } : {}),
            ...(filter.sampai
              ? { lt: awalTanggalWIB(tambahHari(filter.sampai, 1)) }
              : {}),
          },
        }
      : {}),
  };

  const [rows, total, tabel] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { waktu: "desc" },
      skip: (filter.halaman - 1) * AUDIT_PER_HALAMAN,
      take: AUDIT_PER_HALAMAN,
      select: {
        id: true,
        waktu: true,
        aksi: true,
        tabel: true,
        dataLama: true,
        dataBaru: true,
        user: { select: { nama: true } },
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      distinct: ["tabel"],
      select: { tabel: true },
      orderBy: { tabel: "asc" },
    }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      waktu: r.waktu.toISOString(),
      aksi: r.aksi,
      tabel: r.tabel,
      namaUser: r.user?.nama ?? null,
      dataLama: r.dataLama,
      dataBaru: r.dataBaru,
    })),
    total,
    tabelOpsi: tabel.map((t) => t.tabel),
  };
}
