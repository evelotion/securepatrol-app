"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { formatJam, parseFoto, parseKoordinat } from "@/lib/bukti";
import type { FormState } from "@/lib/form";
import { str } from "@/lib/form";
import { PATROL_RADIUS_M, statusValidasi } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { FIELD_ROLES } from "@/lib/roles";

/**
 * Blok 5 — Catat satu kunjungan patroli.
 *
 * Alur PRD §6: staf scan barcode titik -> ambil foto area -> sistem memvalidasi
 * jarak GPS HP terhadap koordinat checkpoint (radius `PATROL_RADIUS_M`).
 * Hasil validasi disimpan sebagai `status_valid`.
 */
export async function catatPatroli(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(FIELD_ROLES);

  const kode = str(formData.get("kode"));
  if (!kode) {
    return { errors: { kode: "Belum ada barcode yang dipindai." } };
  }

  const foto = parseFoto(str(formData.get("foto")));
  if (!foto.ok) return { errors: { foto: foto.error } };

  const koordinat = parseKoordinat(
    str(formData.get("lat")),
    str(formData.get("long")),
  );
  if (!koordinat.ok) return { errors: { gps: koordinat.error } };

  const checkpoint = await prisma.checkpoint.findFirst({
    where: { kodeBarcode: kode, aktif: true },
  });
  if (!checkpoint) {
    return {
      errors: {
        kode: `Barcode "${kode}" tidak dikenal atau titik sudah nonaktif.`,
      },
    };
  }

  const posisiHP =
    koordinat.value.lat === null || koordinat.value.long === null
      ? null
      : { lat: koordinat.value.lat, long: koordinat.value.long };

  const posisiCheckpoint =
    checkpoint.lat === null || checkpoint.long === null
      ? null
      : {
          lat: Number(checkpoint.lat.toString()),
          long: Number(checkpoint.long.toString()),
        };

  const { statusValid, jarak } = statusValidasi(posisiHP, posisiCheckpoint);

  const now = new Date();
  const log = await prisma.patroliLog.create({
    data: {
      userId: actor.id,
      checkpointId: checkpoint.id,
      waktu: now,
      foto: foto.value,
      lat: posisiHP?.lat ?? null,
      long: posisiHP?.long ?? null,
      statusValid,
    },
  });

  await writeAudit({
    userId: actor.id,
    aksi: "PATROLI_SCAN",
    tabel: "PatroliLog",
    dataBaru: {
      id: log.id,
      checkpointId: checkpoint.id,
      namaTitik: checkpoint.namaTitik,
      kodeBarcode: kode,
      lat: posisiHP?.lat ?? null,
      long: posisiHP?.long ?? null,
      statusValid,
      jarak,
      foto: "base64",
    },
  });

  revalidatePath("/patroli");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: `${checkpoint.namaTitik} tercatat pukul ${formatJam(now)}.`,
    ...(statusValid
      ? {}
      : {
          warning:
            jarak === null
              ? "HP tidak mengirim lokasi — kunjungan ditandai TIDAK VALID."
              : `Jarak ±${Math.round(jarak)} m dari titik (maksimal ${PATROL_RADIUS_M} m) — kunjungan ditandai TIDAK VALID.`,
        }),
  };
}
