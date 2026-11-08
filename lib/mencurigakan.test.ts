import { describe, expect, it } from "vitest";

import { ALASAN_TERLALU_CEPAT } from "./geo";
import {
  alasanTerlaluCepat,
  rekapMencurigakan,
  type ScanTidakValid,
} from "./mencurigakan";

let n = 0;
function scan(
  userId: string,
  alasan: string | null,
  menit = n,
  nama = `Nama ${userId}`,
): ScanTidakValid {
  n += 1;
  return {
    id: `log-${n}`,
    userId,
    nama,
    regu: "Regu A",
    waktu: new Date(Date.UTC(2026, 10, 7, 0, menit)),
    namaTitik: `Titik ${n}`,
    alasan,
    jarakM: null,
  };
}

describe("alasanTerlaluCepat", () => {
  it("mengenali alasan baku, juga bila diikuti alasan lain", () => {
    expect(alasanTerlaluCepat(ALASAN_TERLALU_CEPAT)).toBe(true);
    expect(alasanTerlaluCepat(`${ALASAN_TERLALU_CEPAT}; di luar radius`)).toBe(true);
    expect(alasanTerlaluCepat("di luar radius")).toBe(false);
    expect(alasanTerlaluCepat(null)).toBe(false);
  });
});

describe("rekapMencurigakan", () => {
  it("kosong bila tidak ada scan tidak valid", () => {
    expect(rekapMencurigakan([])).toEqual([]);
  });

  it("menghitung tidak valid dan terlalu cepat per petugas", () => {
    const hasil = rekapMencurigakan([
      scan("a", ALASAN_TERLALU_CEPAT),
      scan("a", ALASAN_TERLALU_CEPAT),
      scan("a", "di luar radius"),
      scan("b", "akurasi GPS buruk"),
    ]);
    const a = hasil.find((p) => p.userId === "a")!;
    expect(a.tidakValid).toBe(3);
    expect(a.terlaluCepat).toBe(2);
    const b = hasil.find((p) => p.userId === "b")!;
    expect(b.tidakValid).toBe(1);
    expect(b.terlaluCepat).toBe(0);
  });

  it("urut: terlalu cepat terbanyak, lalu tidak valid, lalu nama", () => {
    const hasil = rekapMencurigakan([
      scan("c", "di luar radius", 1, "Citra"),
      scan("c", "di luar radius", 2, "Citra"),
      scan("c", "di luar radius", 3, "Citra"),
      scan("b", ALASAN_TERLALU_CEPAT, 4, "Budi"),
      scan("a", ALASAN_TERLALU_CEPAT, 5, "Adi"),
      scan("a", ALASAN_TERLALU_CEPAT, 6, "Adi"),
    ]);
    expect(hasil.map((p) => p.nama)).toEqual(["Adi", "Budi", "Citra"]);
  });

  it("detail terbaru dulu dan dibatasi", () => {
    const rows = Array.from({ length: 5 }, (_, i) => scan("a", "di luar radius", i));
    const [p] = rekapMencurigakan(rows, 3);
    expect(p.tidakValid).toBe(5);
    expect(p.scan).toHaveLength(3);
    const waktu = p.scan.map((s) => s.waktu.getTime());
    expect([...waktu].sort((x, y) => y - x)).toEqual(waktu);
  });

  it("alasan kosong tetap tampil sebagai 'tidak valid'", () => {
    const [p] = rekapMencurigakan([scan("a", null)]);
    expect(p.scan[0].alasan).toBe("tidak valid");
  });
});
