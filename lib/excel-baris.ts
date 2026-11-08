/**
 * Pembentuk baris export Excel (murni, tanpa DB/DOM) — teruji tanpa database.
 * Data mentah dari Prisma diubah menjadi baris berformat; `lib/excel-laporan.ts`
 * yang menulisnya ke workbook.
 */

import {
  KATEGORI_LABEL,
  PRIORITAS_LABEL,
  STATUS_LABEL,
  type KategoriInsiden,
  type PrioritasInsiden,
  type StatusInsiden,
} from "./insiden";

export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export type Warna = "ok" | "warn" | "bad" | "netral";
export type SelStatus = { teks: string; warna: Warna };
/** `key` = kunci Foto Cloudinary, dipakai bila thumbnail ikut ditanam. */
export type Tautan = { teks: string; url: string; key?: string };

/**
 * Excel tidak menyimpan zona waktu. Geser +7 jam supaya sel tanggal/jam
 * menampilkan waktu WIB (nilai UTC dari Date hasil geseran = jam dinding WIB).
 */
export function keWaktuWib(tanggal: Date): Date {
  return new Date(tanggal.getTime() + WIB_OFFSET_MS);
}

export function urlFoto(origin: string, fotoId: string): string {
  return `${origin.replace(/\/+$/, "")}/api/foto/${fotoId}`;
}

export function urlMaps(lat: string | number, long: string | number): string {
  return `https://www.google.com/maps?q=${lat},${long}`;
}

function tautanLokasi(lat: string | null, long: string | null): Tautan | null {
  if (lat === null || long === null) return null;
  const a = Number(lat);
  const b = Number(long);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { teks: `${a.toFixed(6)}, ${b.toFixed(6)}`, url: urlMaps(a, b) };
}

export function tautanFoto(
  origin: string,
  key: string | null,
  idPerKey: ReadonlyMap<string, string>,
): Tautan | null {
  if (!key) return null;
  const id = idPerKey.get(key);
  if (!id) return null; // foto lama (base64) atau belum terdaftar
  return { teks: "Lihat foto", url: urlFoto(origin, id), key };
}

// ---- Status ------------------------------------------------------------

const STATUS_HADIR: Record<string, SelStatus> = {
  TEPAT_WAKTU: { teks: "Tepat waktu", warna: "ok" },
  TELAT: { teks: "Telat", warna: "warn" },
  PULANG_CEPAT: { teks: "Pulang cepat", warna: "warn" },
  TIDAK_HADIR: { teks: "Tidak hadir", warna: "bad" },
};

export function statusHadirSel(status: string | null): SelStatus {
  return (status && STATUS_HADIR[status]) || { teks: "Tanpa jadwal", warna: "netral" };
}

const STATUS_SCAN: Record<string, SelStatus> = {
  VALID: { teks: "Valid", warna: "ok" },
  TIDAK_VALID: { teks: "Tidak valid", warna: "bad" },
  BELUM_TERVERIFIKASI: { teks: "Belum terverifikasi", warna: "warn" },
};

export function statusScanSel(status: string): SelStatus {
  return STATUS_SCAN[status] ?? { teks: status, warna: "netral" };
}

const WARNA_INSIDEN: Record<StatusInsiden, Warna> = {
  BARU: "bad",
  DITANGANI: "warn",
  SELESAI: "ok",
};

export function statusInsidenSel(status: StatusInsiden): SelStatus {
  return { teks: STATUS_LABEL[status], warna: WARNA_INSIDEN[status] };
}

// ---- Sumber data -------------------------------------------------------

export type SumberAbsensi = {
  waktuMasuk: Date;
  waktuKeluar: Date | null;
  statusHadir: string | null;
  latMasuk: string | null;
  longMasuk: string | null;
  latKeluar: string | null;
  longKeluar: string | null;
  fotoMasuk: string | null;
  fotoKeluar: string | null;
  user: { nama: string; regu: string | null };
  shift: { nama: string } | null;
};

export type SumberPatroli = {
  waktu: Date;
  status: string;
  jarakM: number | null;
  akurasiM: number | null;
  alasan: string | null;
  lat: string | null;
  long: string | null;
  foto: string | null;
  user: { nama: string; regu: string | null };
  checkpoint: { namaTitik: string };
};

export type SumberInsiden = {
  createdAt: Date;
  kategori: KategoriInsiden;
  prioritas: PrioritasInsiden;
  status: StatusInsiden;
  deskripsi: string;
  catatanTindakLanjut: string | null;
  fotoKeys: string[];
  user: { nama: string; regu: string | null };
  penangan: { nama: string } | null;
  checkpoint: { namaTitik: string } | null;
};

// ---- Baris -------------------------------------------------------------

export type BarisAbsensi = {
  tanggal: Date;
  nama: string;
  regu: string;
  shift: string;
  masuk: Date;
  keluar: Date | null;
  status: SelStatus;
  lokasiMasuk: Tautan | null;
  lokasiKeluar: Tautan | null;
  fotoMasuk: Tautan | null;
  fotoKeluar: Tautan | null;
};

export function barisAbsensi(
  rows: SumberAbsensi[],
  origin: string,
  idPerKey: ReadonlyMap<string, string>,
): BarisAbsensi[] {
  return rows.map((r) => ({
    tanggal: keWaktuWib(r.waktuMasuk),
    nama: r.user.nama,
    regu: r.user.regu ?? "-",
    shift: r.shift?.nama ?? "-",
    masuk: keWaktuWib(r.waktuMasuk),
    keluar: r.waktuKeluar ? keWaktuWib(r.waktuKeluar) : null,
    status: statusHadirSel(r.statusHadir),
    lokasiMasuk: tautanLokasi(r.latMasuk, r.longMasuk),
    lokasiKeluar: tautanLokasi(r.latKeluar, r.longKeluar),
    fotoMasuk: tautanFoto(origin, r.fotoMasuk, idPerKey),
    fotoKeluar: tautanFoto(origin, r.fotoKeluar, idPerKey),
  }));
}

export type BarisPatroli = {
  waktu: Date;
  nama: string;
  regu: string;
  titik: string;
  status: SelStatus;
  jarakM: number | null;
  akurasiM: number | null;
  alasan: string;
  lokasi: Tautan | null;
  foto: Tautan | null;
};

export function barisPatroli(
  rows: SumberPatroli[],
  origin: string,
  idPerKey: ReadonlyMap<string, string>,
): BarisPatroli[] {
  return rows.map((r) => ({
    waktu: keWaktuWib(r.waktu),
    nama: r.user.nama,
    regu: r.user.regu ?? "-",
    titik: r.checkpoint.namaTitik,
    status: statusScanSel(r.status),
    jarakM: r.jarakM,
    akurasiM: r.akurasiM,
    alasan: r.alasan ?? "-",
    lokasi: tautanLokasi(r.lat, r.long),
    foto: tautanFoto(origin, r.foto, idPerKey),
  }));
}

export type BarisInsiden = {
  waktu: Date;
  pelapor: string;
  regu: string;
  titik: string;
  kategori: string;
  prioritas: SelStatus;
  status: SelStatus;
  deskripsi: string;
  ditangani: string;
  catatan: string;
  foto: Tautan | null;
  jumlahFoto: number;
};

const WARNA_PRIORITAS: Record<PrioritasInsiden, Warna> = {
  RENDAH: "netral",
  SEDANG: "netral",
  TINGGI: "warn",
  DARURAT: "bad",
};

export function barisInsiden(
  rows: SumberInsiden[],
  origin: string,
  idPerKey: ReadonlyMap<string, string>,
): BarisInsiden[] {
  return rows.map((r) => ({
    waktu: keWaktuWib(r.createdAt),
    pelapor: r.user.nama,
    regu: r.user.regu ?? "-",
    titik: r.checkpoint?.namaTitik ?? "-",
    kategori: KATEGORI_LABEL[r.kategori],
    prioritas: {
      teks: PRIORITAS_LABEL[r.prioritas],
      warna: WARNA_PRIORITAS[r.prioritas],
    },
    status: statusInsidenSel(r.status),
    deskripsi: r.deskripsi,
    ditangani: r.penangan?.nama ?? "-",
    catatan: r.catatanTindakLanjut ?? "-",
    // Satu tautan per baris (foto pertama yang terdaftar); sisanya lewat halaman detail.
    foto:
      r.fotoKeys
        .map((k) => tautanFoto(origin, k, idPerKey))
        .find((t): t is Tautan => t !== null) ?? null,
    jumlahFoto: r.fotoKeys.length,
  }));
}

// ---- Thumbnail ---------------------------------------------------------

/** Thumbnail hanya untuk rentang ≤ 7 hari (jumlah hari inklusif). */
export const THUMBNAIL_HARI_MAKS = 7;
/** Batas jumlah foto yang ditanam agar file tetap ringan. */
export const THUMBNAIL_MAKS_FOTO = 60;

export function hariRentang(dari: string, sampai: string): number {
  const a = Date.parse(`${dari}T00:00:00Z`);
  const b = Date.parse(`${sampai}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

export function thumbnailDiizinkan(dari: string, sampai: string): boolean {
  const hari = hariRentang(dari, sampai);
  return hari >= 1 && hari <= THUMBNAIL_HARI_MAKS;
}

/** Kumpulkan key foto unik dari semua tautan, dibatasi `maks`. */
export function kumpulkanKeyThumbnail(
  tautan: (Tautan | null)[],
  maks = THUMBNAIL_MAKS_FOTO,
): string[] {
  const keys = new Set<string>();
  for (const t of tautan) {
    if (t?.key && keys.size < maks) keys.add(t.key);
  }
  return [...keys];
}
