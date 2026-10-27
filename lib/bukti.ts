import "server-only";

/**
 * Validasi bukti digital absensi & patroli (Blok 4–5).
 * Foto dikirim dari browser sebagai data URL base64 dan disimpan apa adanya
 * ke kolom teks (MVP belum pakai Cloudinary/S3).
 */

/** Batas panjang data URL base64 (~2,6 MB biner) — dijaga juga oleh bodySizeLimit. */
export const MAX_FOTO_LENGTH = 3_500_000;

const FOTO_PATTERN = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Validasi foto base64 dari client. Mengembalikan string data URL utuh. */
export function parseFoto(raw: string): ParseResult<string> {
  if (!raw) {
    return { ok: false, error: "Foto wajib diambil sebelum mengirim." };
  }
  if (raw.length > MAX_FOTO_LENGTH) {
    return {
      ok: false,
      error: "Ukuran foto terlalu besar (maksimal ±2,6 MB). Ambil ulang fotonya.",
    };
  }
  if (!FOTO_PATTERN.test(raw)) {
    return { ok: false, error: "Format foto tidak valid (harus gambar base64)." };
  }
  // Gambar hasil canvas asli selalu jauh lebih panjang dari ini.
  if (raw.length < 1_000) {
    return { ok: false, error: "Foto kosong atau rusak. Ambil ulang fotonya." };
  }

  return { ok: true, value: raw };
}

/**
 * Parse koordinat string dari Geolocation API.
 * Keduanya kosong -> null (izin tanpa lokasi); sebagian kosong -> error.
 */
export function parseKoordinat(
  latRaw: string,
  longRaw: string,
): ParseResult<{ lat: number | null; long: number | null }> {
  if (latRaw === "" && longRaw === "") {
    return { ok: true, value: { lat: null, long: null } };
  }

  if (latRaw === "" || longRaw === "") {
    return {
      ok: false,
      error: "Latitude dan longitude harus dikirim bersamaan.",
    };
  }

  const lat = Number(latRaw);
  const long = Number(longRaw);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { ok: false, error: "Latitude tidak valid." };
  }
  if (!Number.isFinite(long) || long < -180 || long > 180) {
    return { ok: false, error: "Longitude tidak valid." };
  }

  return { ok: true, value: { lat, long } };
}

/** "14:03" — jam lokal WIB untuk pesan & tampilan. */
export { formatJam } from "@/lib/format";

/**
 * Batas hari & jendela waktu pindah ke `lib/waktu.ts` (F1-1):
 * `startOfHariWIB()` / `batasAbsensiTerbuka()` berbasis Asia/Jakarta.
 */
