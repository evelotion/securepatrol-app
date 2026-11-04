"use server";

import { revalidatePath } from "next/cache";

import { requireRole, type SessionUser } from "@/lib/auth";
import { toJson, writeAudit } from "@/lib/audit";
import type { FormState } from "@/lib/form";
import { str } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { JADWAL_ROLES } from "@/lib/roles";
import { tanggalDB, tanggalDariDB } from "@/lib/shift";

/** F4-2 — penugasan jadwal jaga per user per tanggal. */

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/** Tanggal WIB "YYYY-MM-DD" yang benar-benar ada di kalender. */
function tanggalValid(tanggal: string): boolean {
  if (!POLA_TANGGAL.test(tanggal)) return false;
  return tanggalDariDB(tanggalDB(tanggal)) === tanggal;
}

/**
 * Danru hanya boleh mengatur anggota regunya sendiri (PRD §2).
 * Chief & Super Admin boleh semua regu.
 */
async function userDalamWewenang(
  actor: SessionUser,
  userId: string,
): Promise<{ error?: string; nama?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { nama: true, regu: true, aktif: true, role: true },
  });

  if (!user || !user.aktif) return { error: "User tidak ditemukan atau nonaktif." };
  if (user.role === "SUPER_ADMIN") {
    return { error: "Super Admin tidak dijadwalkan sebagai staf jaga." };
  }
  if (actor.role === "DANRU") {
    if (!actor.regu || user.regu !== actor.regu) {
      return { error: "Anda hanya bisa mengatur jadwal anggota regu sendiri." };
    }
  }

  return { nama: user.nama };
}

function revalidateJadwal(): void {
  revalidatePath("/jadwal");
  revalidatePath("/beranda");
  revalidatePath("/dashboard");
}

/** Simpan (buat/ubah) jadwal satu user pada satu tanggal. */
export async function simpanJadwal(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(JADWAL_ROLES);

  const userId = str(formData.get("userId"));
  const shiftId = str(formData.get("shiftId"));
  const tanggal = str(formData.get("tanggal"));

  if (!tanggalValid(tanggal)) {
    return { errors: { tanggal: "Tanggal jadwal tidak valid." } };
  }
  if (!userId || !shiftId) {
    return { errors: { shiftId: "Pilih shift terlebih dahulu." } };
  }

  const wewenang = await userDalamWewenang(actor, userId);
  if (wewenang.error) return { errors: { shiftId: wewenang.error } };

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { nama: true, aktif: true },
  });
  if (!shift?.aktif) {
    return { errors: { shiftId: "Shift tidak ditemukan atau nonaktif." } };
  }

  const row = await prisma.jadwal.upsert({
    where: { userId_tanggal: { userId, tanggal: tanggalDB(tanggal) } },
    create: {
      userId,
      shiftId,
      tanggal: tanggalDB(tanggal),
    },
    update: { shiftId, aktif: true },
  });

  await writeAudit({
    userId: actor.id,
    aksi: "SIMPAN_JADWAL",
    tabel: "Jadwal",
    dataBaru: toJson({
      id: row.id,
      userId,
      nama: wewenang.nama,
      tanggal,
      shiftId,
      shiftNama: shift.nama,
    }),
  });

  revalidateJadwal();
  return {
    ok: true,
    message: `Jadwal ${wewenang.nama} tanggal ${tanggal} diset ke ${shift.nama}.`,
  };
}

/** Kosongkan jadwal (soft delete: `aktif = false`). */
export async function kosongkanJadwal(formData: FormData): Promise<void> {
  const actor = await requireRole(JADWAL_ROLES);

  const userId = str(formData.get("userId"));
  const tanggal = str(formData.get("tanggal"));
  if (!userId || !tanggalValid(tanggal)) return;

  const wewenang = await userDalamWewenang(actor, userId);
  if (wewenang.error) return;

  const target = await prisma.jadwal.findUnique({
    where: { userId_tanggal: { userId, tanggal: tanggalDB(tanggal) } },
  });
  if (!target || !target.aktif) return;

  await prisma.jadwal.update({
    where: { id: target.id },
    data: { aktif: false },
  });

  await writeAudit({
    userId: actor.id,
    aksi: "KOSONGKAN_JADWAL",
    tabel: "Jadwal",
    dataLama: toJson({
      userId,
      nama: wewenang.nama,
      tanggal,
      shiftId: target.shiftId,
      aktif: target.aktif,
    }),
    dataBaru: toJson({ aktif: false }),
  });

  revalidateJadwal();
}
