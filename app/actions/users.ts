"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { toJson, writeAudit } from "@/lib/audit";
import type { FormState } from "@/lib/form";
import { str } from "@/lib/form";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { MASTER_ROLES, ROLES } from "@/lib/roles";
import { destroyAllSessions } from "@/lib/session";

/** Hitung SUPER_ADMIN selain `kecualiId` yang masih aktif. */
async function jumlahSuperAdminLain(kecualiId?: string): Promise<number> {
  return prisma.user.count({
    where: {
      role: "SUPER_ADMIN",
      aktif: true,
      ...(kecualiId ? { id: { not: kecualiId } } : {}),
    },
  });
}

function validate(input: {
  nama: string;
  email: string;
  username: string;
  password: string;
  role: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (input.nama.length < 2) errors.nama = "Nama minimal 2 karakter.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = "Format email tidak valid.";
  }
  if (input.password.length < 8) {
    errors.password = "Password minimal 8 karakter.";
  }
  if (input.username && input.username.length < 3) {
    errors.username = "Username minimal 3 karakter.";
  }
  if (!ROLES.includes(input.role as (typeof ROLES)[number])) {
    errors.role = "Role tidak valid.";
  }

  return errors;
}

/** Buat user baru (SUPER_ADMIN only). */
export async function createUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(MASTER_ROLES);

  const nama = str(formData.get("nama"));
  const email = str(formData.get("email")).toLowerCase();
  const username = str(formData.get("username")).toLowerCase();
  const password = str(formData.get("password"));
  const role = str(formData.get("role"));
  const regu = str(formData.get("regu"));

  const errors = validate({ nama, email, username, password, role });
  if (Object.keys(errors).length > 0) return { errors };

  const or: { email?: string; username?: string }[] = [{ email }];
  if (username) or.push({ username });
  const duplicate = await prisma.user.findFirst({ where: { OR: or } });
  if (duplicate) {
    return {
      errors:
        duplicate.email === email
          ? { email: "Email sudah terdaftar." }
          : { username: "Username sudah dipakai." },
    };
  }

  const created = await prisma.user.create({
    data: {
      nama,
      email,
      username: username || null,
      password: hashPassword(password),
      role: role as (typeof ROLES)[number],
      regu: regu || null,
    },
  });

  await writeAudit({
    userId: actor.id,
    aksi: "CREATE_USER",
    tabel: "User",
    dataBaru: toJson({
      id: created.id,
      nama: created.nama,
      email: created.email,
      role: created.role,
      regu: created.regu,
    }),
  });

  revalidatePath("/master/users");
  return { ok: true, message: `User "${nama}" berhasil ditambahkan.` };
}

/** Update user — password dikosongkan berarti tidak diubah. */
export async function updateUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(MASTER_ROLES);

  const id = str(formData.get("id"));
  const nama = str(formData.get("nama"));
  const email = str(formData.get("email")).toLowerCase();
  const username = str(formData.get("username")).toLowerCase();
  const password = str(formData.get("password"));
  const role = str(formData.get("role"));
  const regu = str(formData.get("regu"));

  if (!id) return { errors: { id: "User tidak ditemukan." } };

  const errors = validate({
    nama,
    email,
    username,
    password: password || "--------",
    role,
  });
  if (Object.keys(errors).length > 0) return { errors };

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { errors: { id: "User tidak ditemukan." } };

  // F1-6 — super admin tidak boleh menurunkan role dirinya sendiri.
  if (target.id === actor.id && target.role !== role) {
    return { errors: { role: "Anda tidak bisa mengubah role sendiri." } };
  }

  // F1-6 — perubahan tidak boleh menghapus SUPER_ADMIN aktif terakhir.
  if (target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    const sisaSuperAdmin = await jumlahSuperAdminLain(target.id);
    if (sisaSuperAdmin === 0) {
      return {
        errors: { role: "Tidak bisa menurunkan Super Admin terakhir." },
      };
    }
  }

  const or: { email?: string; username?: string }[] = [{ email }];
  if (username) or.push({ username });
  const duplicate = await prisma.user.findFirst({
    where: { OR: or, NOT: { id } },
  });
  if (duplicate) {
    return {
      errors:
        duplicate.email === email
          ? { email: "Email sudah terdaftar." }
          : { username: "Username sudah dipakai." },
    };
  }

  const before = toJson({
    nama: target.nama,
    email: target.email,
    role: target.role,
    regu: target.regu,
    aktif: target.aktif,
  });

  const updated = await prisma.user.update({
    where: { id },
    data: {
      nama,
      email,
      username: username || null,
      role: role as (typeof ROLES)[number],
      regu: regu || null,
      ...(password ? { password: hashPassword(password) } : {}),
    },
  });

  // F1-7 — password diganti: sesi di perangkat lain langsung ter-logout.
  if (password) {
    await destroyAllSessions(updated.id);
  }

  await writeAudit({
    userId: actor.id,
    aksi: "UPDATE_USER",
    tabel: "User",
    dataLama: before,
    dataBaru: toJson({
      nama: updated.nama,
      email: updated.email,
      role: updated.role,
      regu: updated.regu,
      aktif: updated.aktif,
    }),
  });

  revalidatePath("/master/users");
  return { ok: true, message: `User "${nama}" berhasil diperbarui.` };
}

/** Soft delete: toggle kolom `aktif` (aturan: jangan hapus permanen). */
export async function toggleUserAktif(formData: FormData): Promise<void> {
  const actor = await requireRole(MASTER_ROLES);

  const id = str(formData.get("id"));
  if (!id) return;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return;

  // Tidak boleh menonaktifkan akun sendiri.
  if (target.id === actor.id && target.aktif) return;

  // F1-6 — super admin terakhir tidak boleh dinonaktifkan.
  if (target.role === "SUPER_ADMIN" && target.aktif) {
    const sisaSuperAdmin = await jumlahSuperAdminLain(target.id);
    if (sisaSuperAdmin === 0) return;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { aktif: !target.aktif },
  });

  // F1-7 — nonaktif: paksa logout semua perangkat.
  if (!updated.aktif) {
    await destroyAllSessions(updated.id);
  }

  await writeAudit({
    userId: actor.id,
    aksi: updated.aktif ? "AKTIFKAN_USER" : "NONAKTIFKAN_USER",
    tabel: "User",
    dataLama: toJson({ aktif: target.aktif }),
    dataBaru: toJson({ aktif: updated.aktif }),
  });

  revalidatePath("/master/users");
}
