import "server-only";

import { redirect } from "next/navigation";

import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readSessionToken } from "@/lib/session";

export type SessionUser = {
  id: string;
  nama: string;
  email: string;
  role: Role;
  regu: string | null;
};

/**
 * Baca sesi dari cookie, validasi ke database, dan kembalikan user sempit.
 * Selalu dipanggil dari Server Component / Server Action (bukan dari client).
 * Di-redirect ke /login bila tidak valid.
 */
export async function getCurrentUser(): Promise<SessionUser> {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt.getTime() < Date.now()) redirect("/login");
  if (!session.user.aktif) redirect("/login");

  const { user } = session;
  return {
    id: user.id,
    nama: user.nama,
    email: user.email,
    role: user.role,
    regu: user.regu,
  };
}

/**
 * Guard server: hanya role yang diizinkan yang boleh mengakses.
 * Selain itu di-redirect ke /dashboard.
 */
export async function requireRole(allowed: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!allowed.includes(user.role)) redirect("/dashboard");
  return user;
}
