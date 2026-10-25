import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

type AuditInput = {
  userId: string | null;
  aksi: string;
  tabel: string;
  dataLama?: Prisma.InputJsonValue;
  dataBaru?: Prisma.InputJsonValue;
};

/**
 * Wajib dipanggil di setiap mutasi data (aturan CLAUDE.md).
 * Menulis satu baris ke tabel AuditLog.
 */
export async function writeAudit({
  userId,
  aksi,
  tabel,
  dataLama,
  dataBaru,
}: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      aksi,
      tabel,
      ...(dataLama !== undefined ? { dataLama } : {}),
      ...(dataBaru !== undefined ? { dataBaru } : {}),
    },
  });
}

/** Serialisasi row Prisma apa pun ke JSON aman (Decimal -> string). */
export function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) =>
      v !== null && typeof v === "object" && v.constructor?.name === "Decimal"
        ? String(v)
        : v,
    ),
  ) as Prisma.InputJsonValue;
}
