import "server-only";

import { prisma } from "@/lib/prisma";
import { readSessionToken } from "@/lib/session";

export type SesiAktif = {
  id: string;
  dibuatPada: string;
  berakhirPada: string;
  /** true = sesi perangkat yang sedang dipakai. */
  saatIni: boolean;
};

/** Sesi login yang belum kedaluwarsa milik user (token tidak pernah dikirim ke client). */
export async function getSesiAktif(userId: string): Promise<SesiAktif[]> {
  const [token, rows] = await Promise.all([
    readSessionToken(),
    prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, token: true, createdAt: true, expiresAt: true },
    }),
  ]);

  return rows.map((row) => ({
    id: row.id,
    dibuatPada: row.createdAt.toISOString(),
    berakhirPada: row.expiresAt.toISOString(),
    saatIni: row.token === token,
  }));
}
