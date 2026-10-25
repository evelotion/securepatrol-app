"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { formatJam, parseFoto, parseKoordinat, startOfHari } from "@/lib/bukti";
import type { FormState } from "@/lib/form";
import { str } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { FIELD_ROLES } from "@/lib/roles";

/**
 * Blok 4 — Absensi Kehadiran.
 *
 * Check-in / check-out berisi foto selfie (base64) + koordinat Geolocation API.
 * Foto disimpan langsung ke kolom teks; AuditLog hanya mencatat bahwa foto
 * tersimpan (tanpa isi base64 agar tabel audit tidak membengkak).
 */

async function absensiHariIni(userId: string) {
  return prisma.absensi.findFirst({
    where: { userId, waktuMasuk: { gte: startOfHari() } },
    orderBy: { waktuMasuk: "desc" },
  });
}

/** Absen masuk — sekali sehari, wajib ada foto. */
export async function checkIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(FIELD_ROLES);

  const foto = parseFoto(str(formData.get("foto")));
  if (!foto.ok) return { errors: { foto: foto.error } };

  const koordinat = parseKoordinat(
    str(formData.get("lat")),
    str(formData.get("long")),
  );
  if (!koordinat.ok) return { errors: { gps: koordinat.error } };
  const { lat, long } = koordinat.value;

  const existing = await absensiHariIni(actor.id);
  if (existing && existing.waktuKeluar === null) {
    return {
      errors: {
        foto: `Anda sudah absen masuk pukul ${formatJam(existing.waktuMasuk)}.`,
      },
    };
  }
  if (existing) {
    return { errors: { foto: "Absensi hari ini sudah ditutup (masuk & keluar)." } };
  }

  const now = new Date();
  const created = await prisma.absensi.create({
    data: {
      userId: actor.id,
      waktuMasuk: now,
      fotoMasuk: foto.value,
      latMasuk: lat,
      longMasuk: long,
    },
  });

  await writeAudit({
    userId: actor.id,
    aksi: "ABSENSI_MASUK",
    tabel: "Absensi",
    dataBaru: {
      id: created.id,
      waktuMasuk: now.toISOString(),
      lat: lat,
      long: long,
      foto: "base64",
    },
  });

  revalidatePath("/absensi");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: `Absen masuk tercatat pukul ${formatJam(now)}.`,
    ...(lat === null
      ? { warning: "Lokasi GPS tidak terkirim — kehadiran tanpa koordinat." }
      : {}),
  };
}

/** Absen keluar — mengisi baris absensi yang masih terbuka. */
export async function checkOut(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(FIELD_ROLES);

  const foto = parseFoto(str(formData.get("foto")));
  if (!foto.ok) return { errors: { foto: foto.error } };

  const koordinat = parseKoordinat(
    str(formData.get("lat")),
    str(formData.get("long")),
  );
  if (!koordinat.ok) return { errors: { gps: koordinat.error } };
  const { lat, long } = koordinat.value;

  const existing = await absensiHariIni(actor.id);
  if (!existing) {
    return { errors: { foto: "Belum ada absen masuk hari ini." } };
  }
  if (existing.waktuKeluar) {
    return {
      errors: {
        foto: `Anda sudah absen keluar pukul ${formatJam(existing.waktuKeluar)}.`,
      },
    };
  }

  const now = new Date();
  await prisma.absensi.update({
    where: { id: existing.id },
    data: {
      waktuKeluar: now,
      fotoKeluar: foto.value,
      latKeluar: lat,
      longKeluar: long,
    },
  });

  await writeAudit({
    userId: actor.id,
    aksi: "ABSENSI_KELUAR",
    tabel: "Absensi",
    dataBaru: {
      id: existing.id,
      waktuKeluar: now.toISOString(),
      lat: lat,
      long: long,
      foto: "base64",
    },
  });

  revalidatePath("/absensi");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: `Absen keluar tercatat pukul ${formatJam(now)}.`,
    ...(lat === null
      ? { warning: "Lokasi GPS tidak terkirim — pulang tanpa koordinat." }
      : {}),
  };
}
