"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { toJson, writeAudit } from "@/lib/audit";
import { parseKoordinat } from "@/lib/bukti";
import type { FormState } from "@/lib/form";
import { str } from "@/lib/form";
import {
  bolehTransisi,
  CATATAN_MAKS,
  DESKRIPSI_DARURAT,
  dalamJendelaDuplikat,
  JENDELA_DUPLIKAT_DARURAT_MS,
  validasiInsiden,
} from "@/lib/insiden";
import { prisma } from "@/lib/prisma";
import { DASHBOARD_ROLES, FIELD_ROLES } from "@/lib/roles";
import { userDalamScope } from "@/lib/scope";

function revalidateInsiden(): void {
  revalidatePath("/insiden");
  revalidatePath("/dashboard");
  revalidatePath("/beranda");
}

/** Baca lat/long/akurasi dari form; lokasi opsional (insiden tetap dicatat tanpa GPS). */
function bacaLokasi(
  lat: string,
  long: string,
  accuracy: string,
):
  | { ok: true; lat: number | null; long: number | null; akurasiM: number | null }
  | { ok: false; error: string } {
  const koordinat = parseKoordinat(lat, long);
  if (!koordinat.ok) return { ok: false, error: koordinat.error };

  const akurasi = accuracy === "" ? NaN : Number(accuracy);
  return {
    ok: true,
    lat: koordinat.value.lat,
    long: koordinat.value.long,
    akurasiM: Number.isFinite(akurasi) && akurasi >= 0 ? Math.round(akurasi) : null,
  };
}

/** F4-4 — staf lapangan melaporkan insiden (opsional dengan foto, GPS, dan titik). */
export async function laporInsiden(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(FIELD_ROLES);

  const hasil = validasiInsiden({
    kategori: str(formData.get("kategori")),
    prioritas: str(formData.get("prioritas")),
    deskripsi: str(formData.get("deskripsi")),
    fotoKeys: formData.getAll("foto").map((v) => str(v)),
  });
  if (!hasil.ok) return { errors: hasil.errors };

  const lokasi = bacaLokasi(
    str(formData.get("lat")),
    str(formData.get("long")),
    str(formData.get("accuracy")),
  );
  if (!lokasi.ok) return { errors: { gps: lokasi.error } };

  // Setiap foto harus terdaftar dan milik pelapor sendiri.
  const { fotoKeys } = hasil.value;
  if (fotoKeys.length > 0) {
    const milikSaya = await prisma.foto.count({
      where: { key: { in: fotoKeys }, userId: actor.id },
    });
    if (milikSaya !== fotoKeys.length) {
      return { errors: { foto: "Foto tidak valid atau bukan milik Anda." } };
    }
  }

  const checkpointId = str(formData.get("checkpointId"));
  if (checkpointId) {
    const ada = await prisma.checkpoint.findFirst({
      where: { id: checkpointId, aktif: true },
      select: { id: true },
    });
    if (!ada) return { errors: { checkpointId: "Titik patroli tidak ditemukan." } };
  }

  const dibuat = await prisma.insiden.create({
    data: {
      userId: actor.id,
      kategori: hasil.value.kategori,
      prioritas: hasil.value.prioritas,
      deskripsi: hasil.value.deskripsi,
      fotoKeys,
      lat: lokasi.lat,
      long: lokasi.long,
      akurasiM: lokasi.akurasiM,
      checkpointId: checkpointId || null,
    },
  });

  await writeAudit({
    userId: actor.id,
    aksi: "CREATE_INSIDEN",
    tabel: "Insiden",
    dataBaru: toJson(dibuat),
  });

  revalidateInsiden();
  return { ok: true, message: "Laporan insiden terkirim ke Danru dan Chief." };
}

/**
 * F4-5 — tombol darurat. Dipanggil client setelah tombol ditahan 2 detik.
 * Membuat insiden prioritas DARURAT; sinyal berulang dalam 5 menit tidak digandakan.
 */
export async function kirimDarurat(input: {
  lat: string;
  long: string;
  accuracy: string;
}): Promise<FormState> {
  const actor = await requireRole(FIELD_ROLES);

  const lokasi = bacaLokasi(
    str(input.lat),
    str(input.long),
    str(input.accuracy),
  );
  // Lokasi yang rusak tidak boleh menghalangi sinyal darurat: kirim tanpa lokasi.
  const posisi = lokasi.ok
    ? lokasi
    : { lat: null, long: null, akurasiM: null };

  const sekarang = new Date();
  const sebelumnya = await prisma.insiden.findFirst({
    where: {
      userId: actor.id,
      prioritas: "DARURAT",
      status: "BARU",
      createdAt: { gte: new Date(sekarang.getTime() - JENDELA_DUPLIKAT_DARURAT_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (dalamJendelaDuplikat(sebelumnya?.createdAt ?? null, sekarang)) {
    return {
      ok: true,
      message: "Sinyal darurat sudah terkirim. Danru dan Chief sedang diberi tahu.",
    };
  }

  const dibuat = await prisma.insiden.create({
    data: {
      userId: actor.id,
      kategori: "LAINNYA",
      prioritas: "DARURAT",
      deskripsi: DESKRIPSI_DARURAT,
      fotoKeys: [],
      lat: posisi.lat,
      long: posisi.long,
      akurasiM: posisi.akurasiM,
    },
  });

  await writeAudit({
    userId: actor.id,
    aksi: "TOMBOL_DARURAT",
    tabel: "Insiden",
    dataBaru: toJson(dibuat),
  });

  revalidateInsiden();
  return {
    ok: true,
    message: "Sinyal darurat terkirim. Tetap di tempat aman, bantuan segera datang.",
  };
}

type HasilUbah =
  | { ok: true; pesan: string }
  | { ok: false; pesan: string };

/**
 * Ubah status insiden dengan guard atomik: `updateMany` hanya jalan bila status
 * di DB masih sama dengan yang dibaca, jadi dua manager yang klik bersamaan
 * tidak saling menimpa.
 */
async function ubahStatus(
  actor: Awaited<ReturnType<typeof requireRole>>,
  id: string,
  ke: "DITANGANI" | "SELESAI",
  catatan: string,
): Promise<HasilUbah> {
  const target = await prisma.insiden.findUnique({
    where: { id },
    include: { user: { select: { id: true, regu: true } } },
  });
  // Insiden di luar cakupan diperlakukan sama seperti tidak ada.
  if (!target || !userDalamScope(actor, target.user)) {
    return { ok: false, pesan: "Insiden tidak ditemukan." };
  }

  if (!bolehTransisi(target.status, ke)) {
    return {
      ok: false,
      pesan:
        target.status === ke
          ? "Insiden ini sudah berstatus yang sama (mungkin ditangani orang lain)."
          : "Perubahan status tidak diizinkan. Alurnya: Baru → Ditangani → Selesai.",
    };
  }

  const sekarang = new Date();
  const hasil = await prisma.insiden.updateMany({
    where: { id, status: target.status },
    data: {
      status: ke,
      ...(ke === "DITANGANI"
        ? { ditanganiOleh: actor.id, ditanganiPada: sekarang }
        : {}),
      ...(catatan ? { catatanTindakLanjut: catatan } : {}),
    },
  });
  if (hasil.count === 0) {
    return {
      ok: false,
      pesan: "Status insiden baru saja berubah. Muat ulang halaman.",
    };
  }

  await writeAudit({
    userId: actor.id,
    aksi: ke === "DITANGANI" ? "TANGANI_INSIDEN" : "SELESAIKAN_INSIDEN",
    tabel: "Insiden",
    dataLama: toJson({ id, status: target.status }),
    dataBaru: toJson({
      id,
      status: ke,
      catatanTindakLanjut: catatan || target.catatanTindakLanjut,
    }),
  });

  revalidateInsiden();
  return {
    ok: true,
    pesan: ke === "DITANGANI" ? "Insiden ditandai sedang ditangani." : "Insiden diselesaikan.",
  };
}

/** "Saya tangani" — dipakai banner darurat dan daftar insiden manager. */
export async function tanganiInsiden(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(DASHBOARD_ROLES);
  const id = str(formData.get("id"));
  if (!id) return { errors: { id: "Insiden tidak ditemukan." } };

  const hasil = await ubahStatus(actor, id, "DITANGANI", "");
  return hasil.ok
    ? { ok: true, message: hasil.pesan }
    : { errors: { id: hasil.pesan } };
}

/** Selesaikan insiden dengan catatan tindak lanjut. */
export async function selesaikanInsiden(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireRole(DASHBOARD_ROLES);
  const id = str(formData.get("id"));
  const catatan = str(formData.get("catatan"));

  if (!id) return { errors: { id: "Insiden tidak ditemukan." } };
  if (catatan.length < 3) {
    return { errors: { catatan: "Isi catatan tindak lanjut (minimal 3 karakter)." } };
  }
  if (catatan.length > CATATAN_MAKS) {
    return { errors: { catatan: `Catatan maksimal ${CATATAN_MAKS} karakter.` } };
  }

  const hasil = await ubahStatus(actor, id, "SELESAI", catatan);
  return hasil.ok
    ? { ok: true, message: hasil.pesan }
    : { errors: { id: hasil.pesan } };
}
