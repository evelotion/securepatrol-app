"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { toJson, writeAudit } from "@/lib/audit";
import type { FormState } from "@/lib/form";
import { str } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { MASTER_ROLES } from "@/lib/roles";

type CheckpointInput = {
  namaTitik: string;
  kodeBarcode: string;
  lat: string;
  long: string;
  keterangan: string;
};

function validate(
  input: CheckpointInput,
  wajibKodeBarcode = false,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (input.namaTitik.length < 2) {
    errors.namaTitik = "Nama titik minimal 2 karakter.";
  }
  if (!input.kodeBarcode) {
    // F1-5 — saat update, kode barcode tidak boleh dikosongkan.
    if (wajibKodeBarcode) {
      errors.kodeBarcode = "Kode barcode wajib diisi.";
    }
  } else if (!/^[A-Za-z0-9._-]{3,64}$/.test(input.kodeBarcode)) {
    errors.kodeBarcode =
      "Kode hanya boleh huruf/angka/strip/underscore (3-64 karakter).";
  }

  const lat = input.lat === "" ? null : Number(input.lat);
  const long = input.long === "" ? null : Number(input.long);

  if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
    errors.lat = "Latitude harus antara -90 sampai 90.";
  }
  if (long !== null && (Number.isNaN(long) || long < -180 || long > 180)) {
    errors.long = "Longitude harus antara -180 sampai 180.";
  }
  if ((lat === null) !== (long === null)) {
    errors.lat = "Latitude dan longitude harus diisi bersamaan.";
    errors.long = "Latitude dan longitude harus diisi bersamaan.";
  }

  return errors;
}

function genCode(): string {
  return `SP-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** Buat titik patroli baru (SUPER_ADMIN only) + kode barcode unik. */
export async function createCheckpoint(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(MASTER_ROLES);

  const input: CheckpointInput = {
    namaTitik: str(formData.get("namaTitik")),
    kodeBarcode: str(formData.get("kodeBarcode")),
    lat: str(formData.get("lat")),
    long: str(formData.get("long")),
    keterangan: str(formData.get("keterangan")),
  };

  const errors = validate(input);
  if (Object.keys(errors).length > 0) return { errors };

  const kodeBarcode = input.kodeBarcode || genCode();
  const exists = await prisma.checkpoint.findUnique({
    where: { kodeBarcode },
  });
  if (exists) return { errors: { kodeBarcode: "Kode barcode sudah dipakai." } };

  const lat = input.lat === "" ? null : Number(input.lat);
  const long = input.long === "" ? null : Number(input.long);

  const created = await prisma.checkpoint.create({
    data: {
      namaTitik: input.namaTitik,
      kodeBarcode,
      lat,
      long,
      keterangan: input.keterangan || null,
    },
  });

  await writeAudit({
    userId: actor.id,
    aksi: "CREATE_CHECKPOINT",
    tabel: "Checkpoint",
    dataBaru: toJson(created),
  });

  revalidatePath("/master/checkpoints");
  return {
    ok: true,
    message: `Titik "${created.namaTitik}" dibuat dengan kode ${created.kodeBarcode}.`,
  };
}

/** Update titik patroli. */
export async function updateCheckpoint(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(MASTER_ROLES);

  const id = str(formData.get("id"));
  if (!id) return { errors: { id: "Checkpoint tidak ditemukan." } };

  const input: CheckpointInput = {
    namaTitik: str(formData.get("namaTitik")),
    kodeBarcode: str(formData.get("kodeBarcode")),
    lat: str(formData.get("lat")),
    long: str(formData.get("long")),
    keterangan: str(formData.get("keterangan")),
  };

  // F1-5 — update wajib menerima kode barcode terisi & lolos regex.
  const errors = validate(input, true);
  if (Object.keys(errors).length > 0) return { errors };

  const target = await prisma.checkpoint.findUnique({ where: { id } });
  if (!target) return { errors: { id: "Checkpoint tidak ditemukan." } };

  const duplicate = await prisma.checkpoint.findFirst({
    where: { kodeBarcode: input.kodeBarcode, NOT: { id } },
  });
  if (duplicate) {
    return { errors: { kodeBarcode: "Kode barcode sudah dipakai." } };
  }

  const lat = input.lat === "" ? null : Number(input.lat);
  const long = input.long === "" ? null : Number(input.long);

  const before = toJson(target);
  const updated = await prisma.checkpoint.update({
    where: { id },
    data: {
      namaTitik: input.namaTitik,
      kodeBarcode: input.kodeBarcode,
      lat,
      long,
      keterangan: input.keterangan || null,
    },
  });

  await writeAudit({
    userId: actor.id,
    aksi: "UPDATE_CHECKPOINT",
    tabel: "Checkpoint",
    dataLama: before,
    dataBaru: toJson(updated),
  });

  revalidatePath("/master/checkpoints");
  return { ok: true, message: `Titik "${updated.namaTitik}" berhasil diperbarui.` };
}

/** Soft delete: toggle kolom `aktif`. */
export async function toggleCheckpointAktif(formData: FormData): Promise<void> {
  const actor = await requireRole(MASTER_ROLES);

  const id = str(formData.get("id"));
  if (!id) return;

  const target = await prisma.checkpoint.findUnique({ where: { id } });
  if (!target) return;

  const updated = await prisma.checkpoint.update({
    where: { id },
    data: { aktif: !target.aktif },
  });

  await writeAudit({
    userId: actor.id,
    aksi: updated.aktif ? "AKTIFKAN_CHECKPOINT" : "NONAKTIFKAN_CHECKPOINT",
    tabel: "Checkpoint",
    dataLama: toJson({ aktif: target.aktif }),
    dataBaru: toJson({ aktif: updated.aktif }),
  });

  revalidatePath("/master/checkpoints");
}
