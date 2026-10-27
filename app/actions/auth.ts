"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { writeAudit } from "@/lib/audit";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";
import { sisaMenit } from "@/lib/waktu";

export type LoginState = { error?: string } | undefined;

/* F1-3 — batas percobaan login (dihitung dari waktu WIB lewat lib/waktu). */
const WINDOW_MENIT = 15;
const MAX_GAGAL_IDENTIFIER = 5; // per email/username
const MAX_GAGAL_IP = 20; // per alamat IP

/** Ambil IP client dari header proxy Vercel / load balancer. */
async function bacaIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Pesan rate limit bila percobaan gagal sudah melewati batas.
 * Menghitung kapan salah satu kegagalan di dalam jendela akan keluar jendela.
 */
async function cekRateLimit(
  identifier: string,
  ip: string,
): Promise<string | null> {
  const sejak = new Date(Date.now() - WINDOW_MENIT * 60 * 1000);

  const [gagalIdentifier, gagalIp] = await Promise.all([
    prisma.loginAttempt.findMany({
      where: { identifier, sukses: false, waktu: { gte: sejak } },
      orderBy: { waktu: "asc" },
      select: { waktu: true },
    }),
    prisma.loginAttempt.findMany({
      where: { ip, sukses: false, waktu: { gte: sejak } },
      orderBy: { waktu: "asc" },
      select: { waktu: true },
    }),
  ]);

  const kelebihan = (
    daftar: { waktu: Date }[],
    batas: number,
  ): number | null => {
    if (daftar.length < batas) return null;
    // Butuh (daftar.length - batas + 1) kegagalan keluar jendela
    // agar jumlahnya turun di bawah batas.
    const indeks = daftar.length - batas;
    return sisaMenit(daftar[indeks]?.waktu ?? new Date(), WINDOW_MENIT);
  };

  const sisa =
    kelebihan(gagalIdentifier, MAX_GAGAL_IDENTIFIER) ??
    kelebihan(gagalIp, MAX_GAGAL_IP);

  if (sisa === null) return null;
  return `Terlalu banyak percobaan, coba lagi dalam ${sisa} menit.`;
}

/**
 * Login dengan Email/Username + Password (PRD fitur 1).
 * Seluruh validasi & pencatatan AuditLog dilakukan di server.
 */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const identifierRaw = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifierRaw || !password) {
    return { error: "Email/username dan password wajib diisi." };
  }

  const identifier = identifierRaw.toLowerCase();
  const ip = await bacaIp();

  // F1-3 — tolak sebelum query user bila jendela sudah penuh.
  const pesanBlokir = await cekRateLimit(identifier, ip);
  if (pesanBlokir) return { error: pesanBlokir };

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifierRaw, mode: "insensitive" } },
        { username: { equals: identifierRaw, mode: "insensitive" } },
      ],
    },
  });

  // F1-3 — user tidak ada pun tetap menjalankan scrypt terhadap hash dummy,
  // supaya beda waktu respons tidak membocorkan email terdaftar.
  const passwordCocok = user
    ? verifyPassword(password, user.password)
    : verifyPassword(password, DUMMY_PASSWORD_HASH);

  // Pesan sengaja sama untuk user tidak ada & password salah.
  if (!user || !passwordCocok) {
    await prisma.loginAttempt.create({
      data: { identifier, ip, sukses: false },
    });
    await writeAudit({
      userId: user?.id ?? null,
      aksi: "LOGIN_GAGAL",
      tabel: "User",
      dataBaru: { identifier, ip },
    });
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

  await prisma.loginAttempt.create({ data: { identifier, ip, sukses: true } });

  // F1-9 — bersihkan sesi kedaluwarsa milik user ini saat ia login.
  await prisma.session.deleteMany({
    where: { userId: user.id, expiresAt: { lt: new Date() } },
  });

  await createSession(user.id);
  await writeAudit({
    userId: user.id,
    aksi: "LOGIN",
    tabel: "User",
    dataBaru: { identifier, ip },
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
