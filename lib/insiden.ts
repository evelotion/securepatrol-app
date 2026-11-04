/**
 * Logika murni insiden (F4-4 / F4-5) — tanpa DB dan tanpa DOM supaya mudah diuji
 * dan aman diimpor client component.
 */

export const KATEGORI_INSIDEN = [
  "KERUSAKAN",
  "TAMU_MENCURIGAKAN",
  "KEBAKARAN_ASAP",
  "KEHILANGAN",
  "LAINNYA",
] as const;
export type KategoriInsiden = (typeof KATEGORI_INSIDEN)[number];

export const PRIORITAS_INSIDEN = ["RENDAH", "SEDANG", "TINGGI", "DARURAT"] as const;
export type PrioritasInsiden = (typeof PRIORITAS_INSIDEN)[number];

export const STATUS_INSIDEN = ["BARU", "DITANGANI", "SELESAI"] as const;
export type StatusInsiden = (typeof STATUS_INSIDEN)[number];

export const KATEGORI_LABEL: Record<KategoriInsiden, string> = {
  KERUSAKAN: "Kerusakan",
  TAMU_MENCURIGAKAN: "Tamu mencurigakan",
  KEBAKARAN_ASAP: "Kebakaran / asap",
  KEHILANGAN: "Kehilangan",
  LAINNYA: "Lainnya",
};

export const PRIORITAS_LABEL: Record<PrioritasInsiden, string> = {
  RENDAH: "Rendah",
  SEDANG: "Sedang",
  TINGGI: "Tinggi",
  DARURAT: "Darurat",
};

export const STATUS_LABEL: Record<StatusInsiden, string> = {
  BARU: "Baru",
  DITANGANI: "Ditangani",
  SELESAI: "Selesai",
};

/** Kelas badge per prioritas / status (status selalu ditampilkan bersama teks). */
export const PRIORITAS_BADGE: Record<PrioritasInsiden, string> = {
  RENDAH: "badge-slate",
  SEDANG: "badge-indigo",
  TINGGI: "badge-amber",
  DARURAT: "badge-red",
};

export const STATUS_BADGE: Record<StatusInsiden, string> = {
  BARU: "badge-red",
  DITANGANI: "badge-amber",
  SELESAI: "badge-green",
};

export const DESKRIPSI_MIN = 5;
export const DESKRIPSI_MAKS = 1000;
export const CATATAN_MAKS = 1000;
export const FOTO_MAKS = 3;

/** Teks baku insiden yang dibuat tombol darurat. */
export const DESKRIPSI_DARURAT = "Tombol darurat ditekan oleh petugas.";

/** Durasi tahan tombol darurat (ms) — mencegah salah pencet. */
export const TAHAN_DARURAT_MS = 2000;

/** Sinyal darurat berulang dari user yang sama dalam jendela ini tidak dibuat ulang. */
export const JENDELA_DUPLIKAT_DARURAT_MS = 5 * 60 * 1000;

export function isKategori(value: string): value is KategoriInsiden {
  return (KATEGORI_INSIDEN as readonly string[]).includes(value);
}

export function isPrioritas(value: string): value is PrioritasInsiden {
  return (PRIORITAS_INSIDEN as readonly string[]).includes(value);
}

export function isStatus(value: string): value is StatusInsiden {
  return (STATUS_INSIDEN as readonly string[]).includes(value);
}

/**
 * Transisi status yang diizinkan: BARU -> DITANGANI -> SELESAI.
 * Tidak boleh melompat atau mundur.
 */
export function bolehTransisi(dari: StatusInsiden, ke: StatusInsiden): boolean {
  return (
    (dari === "BARU" && ke === "DITANGANI") ||
    (dari === "DITANGANI" && ke === "SELESAI")
  );
}

export type InsidenInput = {
  kategori: string;
  prioritas: string;
  deskripsi: string;
  fotoKeys: string[];
};

export type InsidenValid = {
  kategori: KategoriInsiden;
  prioritas: PrioritasInsiden;
  deskripsi: string;
  fotoKeys: string[];
};

/** Validasi input laporan insiden; kembalikan data bersih atau peta error per field. */
export function validasiInsiden(
  input: InsidenInput,
): { ok: true; value: InsidenValid } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const deskripsi = input.deskripsi.trim();
  const fotoKeys = [...new Set(input.fotoKeys.filter((key) => key !== ""))];

  if (!isKategori(input.kategori)) errors.kategori = "Pilih kategori insiden.";
  if (!isPrioritas(input.prioritas)) errors.prioritas = "Pilih prioritas insiden.";
  if (deskripsi.length < DESKRIPSI_MIN) {
    errors.deskripsi = `Deskripsi minimal ${DESKRIPSI_MIN} karakter.`;
  } else if (deskripsi.length > DESKRIPSI_MAKS) {
    errors.deskripsi = `Deskripsi maksimal ${DESKRIPSI_MAKS} karakter.`;
  }
  if (fotoKeys.length > FOTO_MAKS) {
    errors.foto = `Maksimal ${FOTO_MAKS} foto.`;
  }

  if (
    Object.keys(errors).length > 0 ||
    !isKategori(input.kategori) ||
    !isPrioritas(input.prioritas)
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      kategori: input.kategori,
      prioritas: input.prioritas,
      deskripsi,
      fotoKeys,
    },
  };
}

/** true bila sinyal darurat sebelumnya masih dalam jendela duplikat. */
export function dalamJendelaDuplikat(
  terakhir: Date | null,
  sekarang: Date,
): boolean {
  if (terakhir === null) return false;
  return sekarang.getTime() - terakhir.getTime() < JENDELA_DUPLIKAT_DARURAT_MS;
}

/** Tautan peta untuk koordinat insiden (null bila lokasi tidak ada). */
export function tautanPeta(lat: string | null, long: string | null): string | null {
  if (lat === null || long === null) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(long)}`;
}
