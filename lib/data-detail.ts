import "server-only";

import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DASHBOARD_ROLES } from "@/lib/roles";
import { userDalamScope } from "@/lib/scope";

/** Id Foto (untuk /api/foto/[id]) dari sebuah key; null bila belum terdaftar / base64 lama. */
async function fotoId(key: string | null): Promise<string | null> {
  if (!key) return null;
  const foto = await prisma.foto.findUnique({ where: { key }, select: { id: true } });
  return foto?.id ?? null;
}

export type DetailAbsensi = {
  nama: string;
  regu: string | null;
  shift: string | null;
  statusHadir: string | null;
  waktuMasuk: string;
  waktuKeluar: string | null;
  masuk: { lat: string | null; long: string | null; fotoId: string | null };
  keluar: { lat: string | null; long: string | null; fotoId: string | null };
};

/**
 * Detail absensi untuk manager. Absensi di luar cakupan (mis. Danru Regu A
 * membuka milik Regu B) diperlakukan seperti tidak ada → 404, termasuk bila
 * id ditebak langsung.
 */
export async function getDetailAbsensi(id: string): Promise<DetailAbsensi> {
  const actor = await requireRole(DASHBOARD_ROLES);

  const row = await prisma.absensi.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, nama: true, regu: true } },
      shift: { select: { nama: true } },
    },
  });
  if (!row || !userDalamScope(actor, row.user)) notFound();

  const [masukId, keluarId] = await Promise.all([
    fotoId(row.fotoMasuk),
    fotoId(row.fotoKeluar),
  ]);

  return {
    nama: row.user.nama,
    regu: row.user.regu,
    shift: row.shift?.nama ?? null,
    statusHadir: row.statusHadir,
    waktuMasuk: row.waktuMasuk.toISOString(),
    waktuKeluar: row.waktuKeluar?.toISOString() ?? null,
    // Decimal -> string sebelum ke client component.
    masuk: {
      lat: row.latMasuk?.toString() ?? null,
      long: row.longMasuk?.toString() ?? null,
      fotoId: masukId,
    },
    keluar: {
      lat: row.latKeluar?.toString() ?? null,
      long: row.longKeluar?.toString() ?? null,
      fotoId: keluarId,
    },
  };
}

export type DetailPatroli = {
  nama: string;
  regu: string | null;
  namaTitik: string;
  waktu: string;
  status: "VALID" | "TIDAK_VALID" | "BELUM_TERVERIFIKASI";
  alasan: string | null;
  jarakM: number | null;
  akurasiM: number | null;
  fotoId: string | null;
  posisiHP: { lat: number; long: number } | null;
  posisiTitik: { lat: number; long: number } | null;
};

/** Detail satu scan patroli untuk manager; di luar cakupan → 404. */
export async function getDetailPatroli(id: string): Promise<DetailPatroli> {
  const actor = await requireRole(DASHBOARD_ROLES);

  const row = await prisma.patroliLog.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, nama: true, regu: true } },
      checkpoint: { select: { namaTitik: true, lat: true, long: true } },
    },
  });
  if (!row || !userDalamScope(actor, row.user)) notFound();

  const angka = (v: { toString(): string } | null): number | null =>
    v === null ? null : Number(v.toString());
  const pasang = (lat: number | null, long: number | null) =>
    lat === null || long === null ? null : { lat, long };

  return {
    nama: row.user.nama,
    regu: row.user.regu,
    namaTitik: row.checkpoint.namaTitik,
    waktu: row.waktu.toISOString(),
    status: row.status,
    alasan: row.alasan,
    jarakM: row.jarakM,
    akurasiM: row.akurasiM,
    fotoId: await fotoId(row.foto),
    posisiHP: pasang(angka(row.lat), angka(row.long)),
    posisiTitik: pasang(angka(row.checkpoint.lat), angka(row.checkpoint.long)),
  };
}
