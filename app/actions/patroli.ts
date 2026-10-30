"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { formatJam, parseKoordinat } from "@/lib/bukti";
import type { FormState } from "@/lib/form";
import { str } from "@/lib/form";
import { validasiScan, type Koordinat } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { FIELD_ROLES } from "@/lib/roles";

/** Catat kunjungan patroli yang dinilai server-side menurut aturan Fase 2. */
export async function catatPatroli(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(FIELD_ROLES);

  const kode = str(formData.get("kode"));
  if (!kode) {
    return { errors: { kode: "Belum ada barcode yang dipindai." } };
  }

  const fotoKey = str(formData.get("foto"));
  const foto = await prisma.foto.findFirst({
    where: { key: fotoKey, userId: actor.id },
    select: { key: true },
  });
  if (!foto) return { errors: { foto: "Foto tidak valid atau bukan milik Anda." } };

  const koordinat = parseKoordinat(
    str(formData.get("lat")),
    str(formData.get("long")),
  );
  if (!koordinat.ok) return { errors: { gps: koordinat.error } };

  const accuracyRaw = str(formData.get("accuracy"));
  const accuracyValue = accuracyRaw === "" ? null : Number(accuracyRaw);
  const akurasiM =
    accuracyValue !== null && Number.isFinite(accuracyValue) && accuracyValue >= 0
      ? accuracyValue
      : null;
  const posisiHP: Koordinat | null =
    koordinat.value.lat === null || koordinat.value.long === null
      ? null
      : { lat: koordinat.value.lat, long: koordinat.value.long };

  const checkpoint = await prisma.checkpoint.findFirst({
    where: { kodeBarcode: kode, aktif: true },
    select: { id: true, namaTitik: true, lat: true, long: true },
  });
  if (!checkpoint) {
    return {
      errors: {
        kode: `Barcode "${kode}" tidak dikenal atau titik sudah nonaktif.`,
      },
    };
  }

  const now = new Date();
  const sepuluhMenitLalu = new Date(now.getTime() - 10 * 60 * 1000);
  const [absensiTerbuka, scanCheckpointSebelumnya, scanSebelumnya] =
    await Promise.all([
      prisma.absensi.findFirst({
        where: { userId: actor.id, waktuKeluar: null },
        select: { id: true },
      }),
      prisma.patroliLog.findFirst({
        where: {
          userId: actor.id,
          checkpointId: checkpoint.id,
          waktu: { gte: sepuluhMenitLalu },
        },
        orderBy: { waktu: "desc" },
        select: { waktu: true },
      }),
      prisma.patroliLog.findFirst({
        where: { userId: actor.id },
        orderBy: { waktu: "desc" },
        select: { waktu: true, lat: true, long: true },
      }),
    ]);

  const posisiCheckpoint: Koordinat | null =
    checkpoint.lat === null || checkpoint.long === null
      ? null
      : {
          lat: Number(checkpoint.lat.toString()),
          long: Number(checkpoint.long.toString()),
        };
  const posisiScanSebelumnya: Koordinat | null =
    scanSebelumnya?.lat === null ||
    scanSebelumnya?.lat === undefined ||
    scanSebelumnya.long === null
      ? null
      : {
          lat: Number(scanSebelumnya.lat.toString()),
          long: Number(scanSebelumnya.long.toString()),
        };

  const hasil = validasiScan({
    checkpointId: checkpoint.id,
    sekarang: now,
    posisiHP,
    akurasiM,
    posisiCheckpoint,
    scanSebelumnya: scanSebelumnya
      ? {
        waktu: scanSebelumnya.waktu,
          posisi: posisiScanSebelumnya,
        }
      : null,
    scanCheckpointSebelumnya: scanCheckpointSebelumnya?.waktu ?? null,
    sedangBertugas: absensiTerbuka !== null,
  });

  // Cooldown dan syarat sedang bertugas menolak request tanpa menyimpan log.
  if (hasil.ditolak) {
    return { errors: { gps: hasil.pesanTolak ?? "Scan patroli ditolak." } };
  }

  const log = await prisma.patroliLog.create({
    data: {
      userId: actor.id,
      checkpointId: checkpoint.id,
      waktu: now,
      foto: foto.key,
      lat: posisiHP?.lat ?? null,
      long: posisiHP?.long ?? null,
      status: hasil.status,
      akurasiM: hasil.akurasiM,
      jarakM: hasil.jarakM,
      alasan: hasil.alasan,
    },
    select: { id: true },
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
      posisiHP,
      status: hasil.status,
      alasan: hasil.alasan,
      jarakM: hasil.jarakM,
      akurasiM: hasil.akurasiM,
      fotoKey: foto.key,
    },
  });

  revalidatePath("/patroli");
  revalidatePath("/dashboard");

  const pesanStatus =
    hasil.status === "VALID"
      ? "valid"
      : hasil.status === "BELUM_TERVERIFIKASI"
        ? "belum terverifikasi"
        : "tidak valid";

  return {
    ok: true,
    message: `${checkpoint.namaTitik} tercatat pukul ${formatJam(now)} (${pesanStatus}).`,
    ...(hasil.alasan ? { warning: hasil.alasan } : {}),
  };
}
