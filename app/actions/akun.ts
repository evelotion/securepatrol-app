"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validasiPasswordBaru } from "@/lib/akun";
import { writeAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import type { FormState } from "@/lib/form";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createSession, destroyAllSessions, destroySession } from "@/lib/session";

/* Batas salah password lama — mencegah tebak password dari sesi yang dicuri. */
const WINDOW_MENIT = 15;
const MAX_GAGAL = 5;

/**
 * Ganti password sendiri. Wajib password lama; semua sesi lama dihapus lalu
 * perangkat ini dibuatkan sesi baru, jadi perangkat lain langsung ter-logout.
 */
export async function gantiPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Boleh dipanggil walau `harusGantiPassword` — inilah jalan keluarnya.
  const actor = await getCurrentUser({ izinkanGantiPassword: true });

  const lama = String(formData.get("lama") ?? "");
  const baru = String(formData.get("baru") ?? "");
  const konfirmasi = String(formData.get("konfirmasi") ?? "");

  const errors = validasiPasswordBaru({ lama, baru, konfirmasi });
  if (Object.keys(errors).length > 0) return { errors };

  const identifier = `ganti-password:${actor.id}`;
  const gagal = await prisma.loginAttempt.count({
    where: {
      identifier,
      sukses: false,
      waktu: { gte: new Date(Date.now() - WINDOW_MENIT * 60 * 1000) },
    },
  });
  if (gagal >= MAX_GAGAL) {
    return {
      errors: {
        lama: `Terlalu banyak percobaan, coba lagi dalam ${WINDOW_MENIT} menit.`,
      },
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { password: true },
  });
  if (!user) redirect("/login");

  if (!verifyPassword(lama, user.password)) {
    await prisma.loginAttempt.create({
      data: { identifier, ip: "-", sukses: false },
    });
    await writeAudit({
      userId: actor.id,
      aksi: "GANTI_PASSWORD_GAGAL",
      tabel: "User",
      dataBaru: { alasan: "password_lama_salah" },
    });
    return { errors: { lama: "Password lama salah." } };
  }

  await prisma.user.update({
    where: { id: actor.id },
    data: { password: hashPassword(baru), harusGantiPassword: false },
  });

  // Hapus semua sesi (termasuk perangkat ini) lalu buat sesi baru untuk perangkat ini.
  await destroyAllSessions(actor.id);
  await createSession(actor.id);

  await writeAudit({
    userId: actor.id,
    aksi: "GANTI_PASSWORD",
    tabel: "User",
    dataLama: { harusGantiPassword: actor.harusGantiPassword },
    dataBaru: { harusGantiPassword: false, sesiLainDiakhiri: true },
  });

  revalidatePath("/profil");
  return {
    ok: true,
    message: "Password berhasil diganti. Perangkat lain telah dikeluarkan.",
  };
}

/** Keluar dari semua perangkat, termasuk yang sedang dipakai. */
export async function logoutSemuaPerangkat(): Promise<void> {
  const actor = await getCurrentUser({ izinkanGantiPassword: true });

  const jumlah = await destroyAllSessions(actor.id);
  // Hapus cookie perangkat ini juga.
  await destroySession();

  await writeAudit({
    userId: actor.id,
    aksi: "LOGOUT_SEMUA_PERANGKAT",
    tabel: "Session",
    dataBaru: { sesiDihapus: jumlah },
  });

  redirect("/login");
}
