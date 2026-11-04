"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { toJson, writeAudit } from "@/lib/audit";
import type { FormState } from "@/lib/form";
import { str } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { MASTER_ROLES } from "@/lib/roles";
import { parseJam, TOLERANSI_MAKS_MENIT } from "@/lib/shift";

/** F4-2 — CRUD master shift jaga (SUPER_ADMIN). */

type ShiftInput = {
  nama: string;
  jamMulai: string;
  jamSelesai: string;
  toleransiTelatMenit: number | null;
};

function validate(input: ShiftInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (input.nama.length < 2) errors.nama = "Nama shift minimal 2 karakter.";
  if (parseJam(input.jamMulai) === null) {
    errors.jamMulai = "Jam mulai harus format HH:MM (00:00–23:59).";
  }
  if (parseJam(input.jamSelesai) === null) {
    errors.jamSelesai = "Jam selesai harus format HH:MM (00:00–23:59).";
  }
  if (
    parseJam(input.jamMulai) !== null &&
    input.jamMulai === input.jamSelesai
  ) {
    errors.jamSelesai = "Jam selesai tidak boleh sama dengan jam mulai.";
  }
  if (
    input.toleransiTelatMenit === null ||
    !Number.isInteger(input.toleransiTelatMenit) ||
    input.toleransiTelatMenit < 0 ||
    input.toleransiTelatMenit > TOLERANSI_MAKS_MENIT
  ) {
    errors.toleransiTelatMenit = `Toleransi harus 0–${TOLERANSI_MAKS_MENIT} menit.`;
  }

  return errors;
}

function bacaInput(formData: FormData): ShiftInput {
  const toleransiRaw = str(formData.get("toleransiTelatMenit"));
  return {
    nama: str(formData.get("nama")),
    jamMulai: str(formData.get("jamMulai")),
    jamSelesai: str(formData.get("jamSelesai")),
    toleransiTelatMenit: toleransiRaw === "" ? 15 : Number(toleransiRaw),
  };
}

function revalidateShift(): void {
  revalidatePath("/master/shifts");
  revalidatePath("/jadwal");
  revalidatePath("/master/rute");
}

/** Buat shift baru. */
export async function createShift(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(MASTER_ROLES);
  const input = bacaInput(formData);

  const errors = validate(input);
  if (Object.keys(errors).length > 0) return { errors };

  const duplicate = await prisma.shift.findUnique({
    where: { nama: input.nama },
  });
  if (duplicate) return { errors: { nama: "Nama shift sudah dipakai." } };

  const created = await prisma.shift.create({
    data: {
      nama: input.nama,
      jamMulai: input.jamMulai,
      jamSelesai: input.jamSelesai,
      toleransiTelatMenit: input.toleransiTelatMenit ?? 15,
    },
  });

  await writeAudit({
    userId: actor.id,
    aksi: "CREATE_SHIFT",
    tabel: "Shift",
    dataBaru: toJson(created),
  });

  revalidateShift();
  return { ok: true, message: `Shift "${created.nama}" berhasil dibuat.` };
}

/** Ubah shift. */
export async function updateShift(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(MASTER_ROLES);

  const id = str(formData.get("id"));
  if (!id) return { errors: { id: "Shift tidak ditemukan." } };

  const input = bacaInput(formData);
  const errors = validate(input);
  if (Object.keys(errors).length > 0) return { errors };

  const target = await prisma.shift.findUnique({ where: { id } });
  if (!target) return { errors: { id: "Shift tidak ditemukan." } };

  const duplicate = await prisma.shift.findFirst({
    where: { nama: input.nama, NOT: { id } },
  });
  if (duplicate) return { errors: { nama: "Nama shift sudah dipakai." } };

  const updated = await prisma.shift.update({
    where: { id },
    data: {
      nama: input.nama,
      jamMulai: input.jamMulai,
      jamSelesai: input.jamSelesai,
      toleransiTelatMenit: input.toleransiTelatMenit ?? 15,
    },
  });

  await writeAudit({
    userId: actor.id,
    aksi: "UPDATE_SHIFT",
    tabel: "Shift",
    dataLama: toJson(target),
    dataBaru: toJson(updated),
  });

  revalidateShift();
  return { ok: true, message: `Shift "${updated.nama}" berhasil diperbarui.` };
}

/** Soft delete: toggle kolom `aktif`. */
export async function toggleShiftAktif(formData: FormData): Promise<void> {
  const actor = await requireRole(MASTER_ROLES);

  const id = str(formData.get("id"));
  if (!id) return;

  const target = await prisma.shift.findUnique({ where: { id } });
  if (!target) return;

  const updated = await prisma.shift.update({
    where: { id },
    data: { aktif: !target.aktif },
  });

  await writeAudit({
    userId: actor.id,
    aksi: updated.aktif ? "AKTIFKAN_SHIFT" : "NONAKTIFKAN_SHIFT",
    tabel: "Shift",
    dataLama: toJson({ aktif: target.aktif }),
    dataBaru: toJson({ aktif: updated.aktif }),
  });

  revalidateShift();
}
