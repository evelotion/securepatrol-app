import { randomBytes } from "node:crypto";
import "server-only";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "sp_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

/** Buat sesi login, simpan token acak ke tabel Session + set cookie httpOnly. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await prisma.session.create({
    data: { token, userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** Baca token sesi dari cookie (tanpa validasi DB). */
export async function readSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Hapus SEMUA sesi milik satu user (F1-7).
 * Dipakai saat password diganti atau akun dinonaktifkan,
 * supaya perangkat lain langsung ter-logout.
 */
export async function destroyAllSessions(userId: string): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { userId } });
  return result.count;
}

/** Hapus sesi dari DB + hapus cookie. Kembalikan userId sesi yang dihapus. */
export async function destroySession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  let userId: string | null = null;

  if (token) {
    const session = await prisma.session.findUnique({ where: { token } });
    userId = session?.userId ?? null;
    await prisma.session.deleteMany({ where: { token } });
  }

  cookieStore.delete(SESSION_COOKIE);
  return userId;
}
