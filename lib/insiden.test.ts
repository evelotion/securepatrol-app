import { describe, expect, it } from "vitest";

import {
  bolehTransisi,
  dalamJendelaDuplikat,
  tautanPeta,
  validasiInsiden,
} from "./insiden";

const dasar = {
  kategori: "KERUSAKAN",
  prioritas: "SEDANG",
  deskripsi: "Pintu lobi rusak",
  fotoKeys: [] as string[],
};

describe("bolehTransisi", () => {
  it("hanya mengizinkan BARU -> DITANGANI -> SELESAI", () => {
    expect(bolehTransisi("BARU", "DITANGANI")).toBe(true);
    expect(bolehTransisi("DITANGANI", "SELESAI")).toBe(true);
  });

  it("menolak lompat, mundur, dan diam di tempat", () => {
    expect(bolehTransisi("BARU", "SELESAI")).toBe(false);
    expect(bolehTransisi("SELESAI", "DITANGANI")).toBe(false);
    expect(bolehTransisi("DITANGANI", "BARU")).toBe(false);
    expect(bolehTransisi("BARU", "BARU")).toBe(false);
  });
});

describe("validasiInsiden", () => {
  it("menerima input yang benar dan merapikan deskripsi", () => {
    const hasil = validasiInsiden({ ...dasar, deskripsi: "  Pintu lobi rusak  " });
    expect(hasil.ok).toBe(true);
    if (hasil.ok) expect(hasil.value.deskripsi).toBe("Pintu lobi rusak");
  });

  it("menolak kategori, prioritas, dan deskripsi yang tidak valid", () => {
    const hasil = validasiInsiden({
      kategori: "ASAL",
      prioritas: "SANGAT",
      deskripsi: "abc",
      fotoKeys: [],
    });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) {
      expect(Object.keys(hasil.errors).sort()).toEqual([
        "deskripsi",
        "kategori",
        "prioritas",
      ]);
    }
  });

  it("menghapus foto kosong/duplikat dan membatasi maksimal 3", () => {
    const ok = validasiInsiden({ ...dasar, fotoKeys: ["a", "a", "", "b"] });
    expect(ok.ok && ok.value.fotoKeys).toEqual(["a", "b"]);

    const lebih = validasiInsiden({ ...dasar, fotoKeys: ["a", "b", "c", "d"] });
    expect(lebih.ok).toBe(false);
    if (!lebih.ok) expect(lebih.errors.foto).toBeDefined();
  });

  it("menolak deskripsi lebih dari 1000 karakter", () => {
    const hasil = validasiInsiden({ ...dasar, deskripsi: "x".repeat(1001) });
    expect(hasil.ok).toBe(false);
  });
});

describe("dalamJendelaDuplikat", () => {
  const sekarang = new Date("2026-11-05T10:00:00Z");

  it("true bila sinyal sebelumnya < 5 menit", () => {
    expect(dalamJendelaDuplikat(new Date("2026-11-05T09:56:00Z"), sekarang)).toBe(true);
  });

  it("false bila sudah lewat 5 menit atau belum ada sinyal", () => {
    expect(dalamJendelaDuplikat(new Date("2026-11-05T09:54:00Z"), sekarang)).toBe(false);
    expect(dalamJendelaDuplikat(null, sekarang)).toBe(false);
  });
});

describe("tautanPeta", () => {
  it("membuat tautan bila ada koordinat, null bila tidak", () => {
    expect(tautanPeta("-6.2", "106.8")).toContain("q=-6.2,106.8");
    expect(tautanPeta(null, "106.8")).toBeNull();
  });
});
