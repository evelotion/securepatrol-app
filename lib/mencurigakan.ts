/**
 * Rekap "Scan mencurigakan" (anti titik palsu) — murni, tanpa DB.
 * Input: baris PatroliLog berstatus TIDAK_VALID dalam satu periode.
 */

import { ALASAN_TERLALU_CEPAT } from "./geo";

export type ScanTidakValid = {
  id: string;
  userId: string;
  nama: string;
  regu: string | null;
  waktu: Date;
  namaTitik: string;
  alasan: string | null;
  jarakM: number | null;
};

export type ScanMencurigakanDetail = {
  id: string;
  waktu: Date;
  namaTitik: string;
  alasan: string;
  terlaluCepat: boolean;
};

export type PetugasMencurigakan = {
  userId: string;
  nama: string;
  regu: string | null;
  /** Semua scan TIDAK_VALID dalam periode. */
  tidakValid: number;
  /** Di antaranya yang alasannya "terlalu cepat dari titik sebelumnya". */
  terlaluCepat: number;
  /** Scan terbaru lebih dulu, dipotong `batasDetail`. */
  scan: ScanMencurigakanDetail[];
};

/** true bila alasan scan menandai waktu tempuh terlalu singkat. */
export function alasanTerlaluCepat(alasan: string | null): boolean {
  return alasan !== null && alasan.startsWith(ALASAN_TERLALU_CEPAT);
}

/**
 * Kelompokkan per petugas, urut: terlalu cepat terbanyak, lalu tidak valid
 * terbanyak, lalu nama. Petugas tanpa scan tidak valid tidak ikut.
 */
export function rekapMencurigakan(
  rows: ScanTidakValid[],
  batasDetail = 10,
): PetugasMencurigakan[] {
  const peta = new Map<string, PetugasMencurigakan>();

  const urut = [...rows].sort((a, b) => b.waktu.getTime() - a.waktu.getTime());
  for (const r of urut) {
    let p = peta.get(r.userId);
    if (!p) {
      p = {
        userId: r.userId,
        nama: r.nama,
        regu: r.regu,
        tidakValid: 0,
        terlaluCepat: 0,
        scan: [],
      };
      peta.set(r.userId, p);
    }
    const cepat = alasanTerlaluCepat(r.alasan);
    p.tidakValid += 1;
    if (cepat) p.terlaluCepat += 1;
    if (p.scan.length < batasDetail) {
      p.scan.push({
        id: r.id,
        waktu: r.waktu,
        namaTitik: r.namaTitik,
        alasan: r.alasan ?? "tidak valid",
        terlaluCepat: cepat,
      });
    }
  }

  return [...peta.values()].sort(
    (a, b) =>
      b.terlaluCepat - a.terlaluCepat ||
      b.tidakValid - a.tidakValid ||
      a.nama.localeCompare(b.nama),
  );
}
