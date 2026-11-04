/** Perbandingan dataLama vs dataBaru di AuditLog (F4-8) — murni agar bisa diuji. */

export type BarisDiff = {
  field: string;
  lama: string | null;
  baru: string | null;
};

function tampil(value: unknown): string | null {
  if (value === undefined) return null;
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function isObjek(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Daftar field yang berbeda. Field yang hanya ada di satu sisi tampil dengan
 * sisi lain `null` (bukan teks "null"). Nilai non-objek dibungkus sebagai `(nilai)`.
 */
export function diffAudit(lama: unknown, baru: unknown): BarisDiff[] {
  const a = isObjek(lama) ? lama : lama === undefined || lama === null ? {} : { "(nilai)": lama };
  const b = isObjek(baru) ? baru : baru === undefined || baru === null ? {} : { "(nilai)": baru };

  const kunci = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  const hasil: BarisDiff[] = [];

  for (const field of kunci) {
    const nilaiLama = tampil(a[field]);
    const nilaiBaru = tampil(b[field]);
    if (nilaiLama !== nilaiBaru) {
      hasil.push({ field, lama: nilaiLama, baru: nilaiBaru });
    }
  }
  return hasil;
}
