import "server-only";

import { getThumbFotoUrl } from "@/lib/cloudinary";
import { whereUserLaporan, type Laporan } from "@/lib/data-laporan";
import {
  barisAbsensi,
  barisInsiden,
  barisPatroli,
  kumpulkanKeyThumbnail,
  type BarisAbsensi,
  type BarisInsiden,
  type BarisPatroli,
} from "@/lib/excel-baris";
import { awalTanggalWIB } from "@/lib/kehadiran";
import { prisma } from "@/lib/prisma";
import { tambahHari } from "@/lib/shift";

/** Batas baris per sheet detail agar export tetap cepat dan file wajar. */
export const EXPORT_BARIS_MAKS = 5_000;

export type DetailExport = {
  absensi: BarisAbsensi[];
  patroli: BarisPatroli[];
  insiden: BarisInsiden[];
};

/**
 * Detail baris untuk export. Memakai filter & cakupan yang sama dengan rekap
 * (`whereUserLaporan`), jadi Danru tetap hanya mendapat regunya.
 */
export async function getDetailExport(
  laporan: Laporan,
  origin: string,
): Promise<DetailExport> {
  const { actor, filter } = laporan;
  const awal = awalTanggalWIB(filter.dari);
  const akhir = awalTanggalWIB(tambahHari(filter.sampai, 1));
  const whereUser = whereUserLaporan(actor, filter);
  const whereUserInsiden = whereUserLaporan(actor, filter, false);
  const infoUser = { select: { nama: true, regu: true } } as const;

  const [absensi, patroli, insiden] = await Promise.all([
    prisma.absensi.findMany({
      where: { waktuMasuk: { gte: awal, lt: akhir }, user: whereUser },
      include: { user: infoUser, shift: { select: { nama: true } } },
      orderBy: { waktuMasuk: "asc" },
      take: EXPORT_BARIS_MAKS,
    }),
    prisma.patroliLog.findMany({
      where: { waktu: { gte: awal, lt: akhir }, user: whereUser },
      include: { user: infoUser, checkpoint: { select: { namaTitik: true } } },
      orderBy: { waktu: "asc" },
      take: EXPORT_BARIS_MAKS,
    }),
    prisma.insiden.findMany({
      where: { createdAt: { gte: awal, lt: akhir }, user: whereUserInsiden },
      include: {
        user: infoUser,
        penangan: { select: { nama: true } },
        checkpoint: { select: { namaTitik: true } },
      },
      orderBy: { createdAt: "asc" },
      take: EXPORT_BARIS_MAKS,
    }),
  ]);

  // Key Foto -> id (untuk URL /api/foto/[id]). Foto lama berformat base64 tidak punya id.
  const keys = new Set<string>();
  for (const a of absensi) {
    if (a.fotoMasuk) keys.add(a.fotoMasuk);
    if (a.fotoKeluar) keys.add(a.fotoKeluar);
  }
  for (const p of patroli) if (p.foto) keys.add(p.foto);
  for (const i of insiden) for (const k of i.fotoKeys) keys.add(k);

  const fotoRows =
    keys.size > 0
      ? await prisma.foto.findMany({
          where: { key: { in: [...keys] } },
          select: { id: true, key: true },
        })
      : [];
  const idPerKey = new Map(fotoRows.map((f) => [f.key, f.id]));

  // Decimal -> string sebelum diformat (aturan proyek).
  const desimal = (v: { toString(): string } | null) => v?.toString() ?? null;

  return {
    absensi: barisAbsensi(
      absensi.map((a) => ({
        ...a,
        latMasuk: desimal(a.latMasuk),
        longMasuk: desimal(a.longMasuk),
        latKeluar: desimal(a.latKeluar),
        longKeluar: desimal(a.longKeluar),
      })),
      origin,
      idPerKey,
    ),
    patroli: barisPatroli(
      patroli.map((p) => ({ ...p, lat: desimal(p.lat), long: desimal(p.long) })),
      origin,
      idPerKey,
    ),
    insiden: barisInsiden(insiden, origin, idPerKey),
  };
}

/**
 * Unduh thumbnail kecil (maks 60 foto, 6 paralel). Foto yang gagal diunduh
 * dilewati; selnya tetap berisi tautan "Lihat foto".
 */
export async function ambilThumbnail(
  detail: DetailExport,
): Promise<Map<string, Buffer>> {
  const keys = kumpulkanKeyThumbnail([
    ...detail.absensi.flatMap((r) => [r.fotoMasuk, r.fotoKeluar]),
    ...detail.patroli.map((r) => r.foto),
    ...detail.insiden.map((r) => r.foto),
  ]);

  const hasil = new Map<string, Buffer>();
  let indeks = 0;
  async function pekerja() {
    while (indeks < keys.length) {
      const key = keys[indeks++];
      try {
        const res = await fetch(getThumbFotoUrl(key), { cache: "no-store" });
        if (res.ok) hasil.set(key, Buffer.from(await res.arrayBuffer()));
      } catch {
        /* lewati: tautan tetap ada */
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, keys.length) }, pekerja));
  return hasil;
}
