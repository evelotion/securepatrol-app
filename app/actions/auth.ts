"use server";

import { redirect } from "next/navigation";

import { writeAudit } from "@/lib/audit";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

/**
 * Login dengan Email/Username + Password (PRD fitur 1).
 * Seluruh validasi & pencatatan AuditLog dilakukan di server.
 */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Email/username dan password wajib diisi." };
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { username: { equals: identifier, mode: "insensitive" } },
      ],
    },
  });

  // Pesan sengaja sama untuk user tidak ada & password salah.
  if (!user || !verifyPassword(password, user.password)) {
    return { error: "Email/username atau password salah." };
  }

  if (!user.aktif) {
    await writeAudit({
      userId: user.id,
      aksi: "LOGIN_DITOLAK",
      tabel: "User",
      dataBaru: { alasan: "akun_nonaktif" },
    });
    return { error: "Akun Anda dinonaktifkan. Hubungi Super Admin." };
  }

  await createSession(user.id);
  await writeAudit({
    userId: user.id,
    aksi: "LOGIN",
    tabel: "User",
    dataBaru: { identifier },
  });

  redirect("/dashboard");
}

/** Keluar dari sesi — hapus token DB + cookie. */
export async function logout(): Promise<void> {
  const userId = await destroySession();

  if (userId) {
    await writeAudit({ userId, aksi: "LOGOUT", tabel: "User" });
  }

  redirect("/login");
}
