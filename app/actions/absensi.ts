"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { formatJam, parseFoto, parseKoordinat } from "@/lib/bukti";
import type { FormState } from "@/lib/form";
import { str } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { FIELD_ROLES } from "@/lib/roles";
import { batasAbsensiTerbuka, startOfHariWIB } from "@/lib/waktu";

/**
 * Blok 4 — Absensi Kehadiran.
 *
 * Check-in / check-out berisi foto selfie (base64) + koordinat Geolocation API.
 * Foto disimpan langsung ke kolom teks; AuditLog hanya mencatat bahwa foto
 * tersimpan (tanpa isi base64 agar tabel audit tidak membengkak).
 */

/** Baris absensi ringkas — kolom foto sengaja tidak diambil (F1-9). */
type AbsensiRingkas = {
  id: string;
  waktuMasuk: Date;
  waktuKeluar: Date | null;
};

const SELECT_RINGKAS = {
  id: true,
  waktuMasuk: true,
  waktuKeluar: true,
} as const;

/**
 * Absensi terbuka (`waktuKeluar: null`) milik user dalam 16 jam terakhir.
 * Dipakai check-in & check-out supaya shift malam 22:00 → 06:00 tetap satu baris (F1-1).
 */
async function absensiTerbuka(userId: string): Promise<AbsensiRingkas | null> {
  return prisma.absensi.findFirst({
    where: {
      userId,
      waktuKeluar: null,
      waktuMasuk: { gte: batasAbsensiTerbuka() },
    },
    orderBy: { waktuMasuk: "desc" },
    select: SELECT_RINGKAS,
  });
}

/** Absensi milik user yang dimulai hari ini (00:00 WIB, bukan hari server). */
async function absensiHariIni(userId: string): Promise<AbsensiRingkas | null> {
  return prisma.absensi.findFirst({
    where: { userId, waktuMasuk: { gte: startOfHariWIB() } },
    orderBy: { waktuMasuk: "desc" },
    select: SELECT_RINGKAS,
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

  const terbuka = await absensiTerbuka(actor.id);
  if (terbuka) {
    return {
      errors: {
        foto: `Anda sudah absen masuk pukul ${formatJam(terbuka.waktuMasuk)}.`,
      },
    };
  }
  const hariIni = await absensiHariIni(actor.id);
  if (hariIni?.waktuKeluar === null) {
    return {
      errors: {
        foto: `Anda sudah absen masuk pukul ${formatJam(hariIni.waktuMasuk)}.`,
      },
    };
  }
  if (hariIni) {
    return { errors: { foto: "Absensi hari ini sudah ditutup (masuk & keluar)." } };
  }

  const now = new Date();
  let created: { id: string };
  try {
    created = await prisma.absensi.create({
      data: {
        userId: actor.id,
        waktuMasuk: now,
        fotoMasuk: foto.value,
        latMasuk: lat,
        longMasuk: long,
      },
      select: { id: true },
    });
  } catch (err) {
    // Indeks unik parsial `absensi_satu_terbuka` — dua request paralel (F1-4).
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { errors: { foto: "Sudah absen masuk." } };
    }
    throw err;
  }

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

  // Cari absensi terbuka dalam 16 jam terakhir — bukan "hari ini" (F1-1),
  // supaya check-out pukul 06:00 WIB untuk shift 22:00 tetap berhasil.
  const existing = await absensiTerbuka(actor.id);
  if (!existing) {
    const hariIni = await absensiHariIni(actor.id);
    if (hariIni?.waktuKeluar) {
      return {
        errors: {
          foto: `Anda sudah absen keluar pukul ${formatJam(hariIni.waktuKeluar)}.`,
        },
      };
    }
    return { errors: { foto: "Belum ada absen masuk hari ini." } };
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
