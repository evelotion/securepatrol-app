"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { toJson, writeAudit } from "@/lib/audit";
import type { FormState } from "@/lib/form";
import { str } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { MASTER_ROLES } from "@/lib/roles";

/** F4-3 — CRUD rute patroli + urutan titik (SUPER_ADMIN). */

const MAKS_PUTARAN = 12;
const MIN_INTERVAL_MENIT = 15;
const MAKS_INTERVAL_MENIT = 480;

type RuteInput = {
  nama: string;
  shiftId: string | null;
  targetPutaran: number;
  intervalMenit: number;
};

type TitikInput = { checkpointId: string; urutan: number };

function bacaInput(formData: FormData): RuteInput {
  const shiftId = str(formData.get("shiftId"));
  return {
    nama: str(formData.get("nama")),
    shiftId: shiftId || null,
    targetPutaran: Number(str(formData.get("targetPutaran"))),
    intervalMenit: Number(str(formData.get("intervalMenit"))),
  };
}

function validate(input: RuteInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (input.nama.length < 2) errors.nama = "Nama rute minimal 2 karakter.";
  if (
    !Number.isInteger(input.targetPutaran) ||
    input.targetPutaran < 1 ||
    input.targetPutaran > MAKS_PUTARAN
  ) {
    errors.targetPutaran = `Target putaran harus 1–${MAKS_PUTARAN}.`;
  }
  if (
    !Number.isInteger(input.intervalMenit) ||
    input.intervalMenit < MIN_INTERVAL_MENIT ||
    input.intervalMenit > MAKS_INTERVAL_MENIT
  ) {
    errors.intervalMenit = `Interval harus ${MIN_INTERVAL_MENIT}–${MAKS_INTERVAL_MENIT} menit.`;
  }

  return errors;
}

/** Baca checkbox `pilih_<checkpointId>` beserta `urutan_<checkpointId>`. */
function bacaTitik(formData: FormData): {
  titik: TitikInput[];
  errors: Record<string, string>;
} {
  const titik: TitikInput[] = [];
  const errors: Record<string, string> = {};

  for (const [kunci, nilai] of formData.entries()) {
    if (!kunci.startsWith("pilih_") || nilai !== "on") continue;

    const checkpointId = kunci.slice("pilih_".length);
    const urutanRaw = Number(str(formData.get(`urutan_${checkpointId}`)));
    titik.push({
      checkpointId,
      urutan:
        Number.isFinite(urutanRaw) && urutanRaw > 0
          ? Math.floor(urutanRaw)
          : titik.length + 1,
    });
  }

  if (titik.length === 0) {
    errors.titik = "Pilih minimal satu titik untuk rute ini.";
    return { titik, errors };
  }

  const urutanTerpakai = new Set<number>();
  for (const t of titik) {
    if (urutanTerpakai.has(t.urutan)) {
      errors.titik = `Urutan ${t.urutan} dipakai lebih dari satu titik.`;
      break;
    }
    urutanTerpakai.add(t.urutan);
  }

  return { titik, errors };
}

/** Validasi shift & checkpoint yang dipilih benar-benar ada. */
async function validasiRelasi(
  input: RuteInput,
  titik: TitikInput[],
): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};

  if (input.shiftId) {
    const shift = await prisma.shift.findUnique({
      where: { id: input.shiftId },
      select: { aktif: true },
    });
    if (!shift?.aktif) errors.shiftId = "Shift tidak ditemukan atau nonaktif.";
  }

  const jumlah = await prisma.checkpoint.count({
    where: {
      id: { in: titik.map((t) => t.checkpointId) },
      aktif: true,
    },
  });
  if (jumlah !== titik.length) {
    errors.titik = "Ada titik yang tidak dikenal atau sudah nonaktif.";
  }

  return errors;
}

function pesanDuplikat(err: unknown): string | null {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    return "Nama rute sudah dipakai.";
  }
  return null;
}

function revalidateRute(): void {
  revalidatePath("/master/rute");
  revalidatePath("/patroli");
  revalidatePath("/beranda");
  revalidatePath("/dashboard");
}

/** Buat rute baru beserta urutan titiknya. */
export async function createRute(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(MASTER_ROLES);

  const input = bacaInput(formData);
  const { titik, errors: errorsTitik } = bacaTitik(formData);
  const errors = { ...validate(input), ...errorsTitik };
  if (Object.keys(errors).length > 0) return { errors };

  const errorsRelasi = await validasiRelasi(input, titik);
  if (Object.keys(errorsRelasi).length > 0) return { errors: errorsRelasi };

  try {
    const created = await prisma.rute.create({
      data: {
        nama: input.nama,
        shiftId: input.shiftId,
        targetPutaran: input.targetPutaran,
        intervalMenit: input.intervalMenit,
        titik: {
          create: titik.map((t) => ({
            checkpointId: t.checkpointId,
            urutan: t.urutan,
          })),
        },
      },
    });

    await writeAudit({
      userId: actor.id,
      aksi: "CREATE_RUTE",
      tabel: "Rute",
      dataBaru: toJson({
        ...created,
        titik: titik.map((t) => t.urutan).sort((a, b) => a - b),
      }),
    });

    revalidateRute();
    return { ok: true, message: `Rute "${created.nama}" berhasil dibuat.` };
  } catch (err) {
    const pesan = pesanDuplikat(err);
    if (pesan) return { errors: { nama: pesan } };
    throw err;
  }
}

/** Ubah rute + ganti seluruh daftar titiknya. */
export async function updateRute(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(MASTER_ROLES);

  const id = str(formData.get("id"));
  if (!id) return { errors: { id: "Rute tidak ditemukan." } };

  const input = bacaInput(formData);
  const { titik, errors: errorsTitik } = bacaTitik(formData);
  const errors = { ...validate(input), ...errorsTitik };
  if (Object.keys(errors).length > 0) return { errors };

  const target = await prisma.rute.findUnique({
    where: { id },
    include: { titik: true },
  });
  if (!target) return { errors: { id: "Rute tidak ditemukan." } };

  const errorsRelasi = await validasiRelasi(input, titik);
  if (Object.keys(errorsRelasi).length > 0) return { errors: errorsRelasi };

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.ruteTitik.deleteMany({ where: { ruteId: id } });
      return tx.rute.update({
        where: { id },
        data: {
          nama: input.nama,
          shiftId: input.shiftId,
          targetPutaran: input.targetPutaran,
          intervalMenit: input.intervalMenit,
          titik: {
            create: titik.map((t) => ({
              checkpointId: t.checkpointId,
              urutan: t.urutan,
            })),
          },
        },
      });
    });

    await writeAudit({
      userId: actor.id,
      aksi: "UPDATE_RUTE",
      tabel: "Rute",
      dataLama: toJson(target),
      dataBaru: toJson(updated),
    });

    revalidateRute();
    return { ok: true, message: `Rute "${updated.nama}" berhasil diperbarui.` };
  } catch (err) {
    const pesan = pesanDuplikat(err);
    if (pesan) return { errors: { nama: pesan } };
    throw err;
  }
}

/** Soft delete: toggle kolom `aktif`. */
export async function toggleRuteAktif(formData: FormData): Promise<void> {
  const actor = await requireRole(MASTER_ROLES);

  const id = str(formData.get("id"));
  if (!id) return;

  const target = await prisma.rute.findUnique({ where: { id } });
  if (!target) return;

  const updated = await prisma.rute.update({
    where: { id },
    data: { aktif: !target.aktif },
  });

  await writeAudit({
    userId: actor.id,
    aksi: updated.aktif ? "AKTIFKAN_RUTE" : "NONAKTIFKAN_RUTE",
    tabel: "Rute",
    dataLama: toJson({ aktif: target.aktif }),
    dataBaru: toJson({ aktif: updated.aktif }),
  });

  revalidateRute();
}
