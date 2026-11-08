import { describe, expect, it } from "vitest";

import { checkpointTerlewat, hitungPutaran, putaranBerjalan, type TitikRute } from "./rute";
import type { ShiftJam } from "./shift";

const wib = (iso: string): Date => new Date(iso);

const SHIFT_PAGI: ShiftJam = {
  nama: "Pagi",
  jamMulai: "08:00",
  jamSelesai: "16:00",
  toleransiTelatMenit: 15,
};

const TITIK: TitikRute[] = [
  { checkpointId: "cp-lobi", namaTitik: "Lobi", urutan: 1 },
  { checkpointId: "cp-parkir", namaTitik: "Parkir", urutan: 2 },
  { checkpointId: "cp-atap", namaTitik: "Atap", urutan: 3 },
];

describe("hitungPutaran", () => {
  it("membagi shift 8 jam menjadi 4 putaran @2 jam", () => {
    const putaran = hitungPutaran({
      rute: { targetPutaran: 4, intervalMenit: 120 },
      shift: SHIFT_PAGI,
      tanggal: "2026-11-04",
      titik: TITIK,
      logs: [],
      sekarang: wib("2026-11-04T07:00:00+07:00"),
    });

    expect(putaran).toHaveLength(4);
    expect(putaran[0].mulai.toISOString()).toBe("2026-11-04T01:00:00.000Z");
    expect(putaran[0].selesai.toISOString()).toBe("2026-11-04T03:00:00.000Z");
    expect(putaran[3].selesai.toISOString()).toBe("2026-11-04T09:00:00.000Z");
    // Sebelum shift mulai: semua putaran BELUM, tidak ada yang terlewat.
    expect(putaran.map((p) => p.status)).toEqual([
      "BELUM",
      "BELUM",
      "BELUM",
      "BELUM",
    ]);
    expect(putaran[0].titik.every((t) => t.status === "BELUM")).toBe(true);
  });

  it("menandai putaran yang berjalan dan yang sudah lewat", () => {
    const putaran = hitungPutaran({
      rute: { targetPutaran: 4, intervalMenit: 120 },
      shift: SHIFT_PAGI,
      tanggal: "2026-11-04",
      titik: TITIK,
      logs: [{ checkpointId: "cp-lobi", waktu: wib("2026-11-04T09:10:00+07:00") }],
      sekarang: wib("2026-11-04T11:00:00+07:00"),
    });

    expect(putaran.map((p) => p.status)).toEqual([
      "SELESAI",
      "BERJALAN",
      "BELUM",
      "BELUM",
    ]);
    // Lobi dipindai di putaran 1, bukan putaran 2.
    expect(putaran[0].titik[0].status).toBe("DIKUNJUNGI");
    expect(putaran[1].titik[0].status).toBe("BELUM");
    // Titik lain di putaran 1 yang jendelanya sudah lewat -> TERLEWAT.
    expect(putaran[0].titik[1].status).toBe("TERLEWAT");
    expect(putaran[0].terlewat).toBe(2);
    expect(putaran[0].dikunjungi).toBe(1);
  });

  it("log di luar jendela putaran tidak dihitung", () => {
    const putaran = hitungPutaran({
      rute: { targetPutaran: 4, intervalMenit: 120 },
      shift: SHIFT_PAGI,
      tanggal: "2026-11-04",
      titik: TITIK,
      logs: [
        { checkpointId: "cp-lobi", waktu: wib("2026-11-04T06:30:00+07:00") },
      ],
      sekarang: wib("2026-11-04T11:00:00+07:00"),
    });

    expect(putaran[0].dikunjungi).toBe(0);
    expect(putaran[0].titik[0].status).toBe("TERLEWAT");
  });

  it("tidak membuat putaran melebihi jam selesai shift", () => {
    const putaran = hitungPutaran({
      rute: { targetPutaran: 10, intervalMenit: 120 },
      shift: SHIFT_PAGI,
      tanggal: "2026-11-04",
      titik: TITIK,
      logs: [],
      sekarang: wib("2026-11-04T11:00:00+07:00"),
    });

    expect(putaran).toHaveLength(4);
    expect(putaran[3].selesai.toISOString()).toBe("2026-11-04T09:00:00.000Z");
  });

  it("shift malam membagi putaran melewati tengah malam", () => {
    const putaran = hitungPutaran({
      rute: { targetPutaran: 2, intervalMenit: 240 },
      shift: {
        nama: "Malam",
        jamMulai: "22:00",
        jamSelesai: "06:00",
        toleransiTelatMenit: 15,
      },
      tanggal: "2026-11-04",
      titik: TITIK,
      logs: [],
      sekarang: wib("2026-11-05T01:00:00+07:00"),
    });

    expect(putaran).toHaveLength(2);
    expect(putaran[0].mulai.toISOString()).toBe("2026-11-04T15:00:00.000Z");
    expect(putaran[1].mulai.toISOString()).toBe("2026-11-04T19:00:00.000Z");
    expect(putaran[1].selesai.toISOString()).toBe("2026-11-04T23:00:00.000Z");
  });

  it("menghasilkan array kosong bila jam shift tidak valid", () => {
    expect(
      hitungPutaran({
        rute: { targetPutaran: 4, intervalMenit: 120 },
        shift: { ...SHIFT_PAGI, jamSelesai: "25:00" },
        tanggal: "2026-11-04",
        titik: TITIK,
        logs: [],
        sekarang: wib("2026-11-04T11:00:00+07:00"),
      }),
    ).toEqual([]);
  });
});

describe("checkpointTerlewat", () => {
  it("mengumpulkan titik yang terlewat di putaran yang sudah lewat", () => {
    const putaran = hitungPutaran({
      rute: { targetPutaran: 2, intervalMenit: 240 },
      shift: SHIFT_PAGI,
      tanggal: "2026-11-04",
      titik: TITIK,
      logs: [
        { checkpointId: "cp-lobi", waktu: wib("2026-11-04T09:00:00+07:00") },
      ],
      sekarang: wib("2026-11-04T13:00:00+07:00"),
    });

    expect(checkpointTerlewat(putaran)).toEqual(
      new Set(["cp-parkir", "cp-atap"]),
    );
  });
});

describe("putaranBerjalan", () => {
  const rute = { targetPutaran: 4, intervalMenit: 120 };
  const cari = (iso: string) =>
    putaranBerjalan({ rute, shift: SHIFT_PAGI, tanggal: "2026-11-04", sekarang: wib(iso) });

  it("memilih jendela yang memuat sekarang", () => {
    const p = cari("2026-11-04T11:30:00+07:00");
    expect(p?.putaran).toBe(2);
    expect(p?.mulai.toISOString()).toBe("2026-11-04T03:00:00.000Z");
    expect(p?.selesai.toISOString()).toBe("2026-11-04T05:00:00.000Z");
  });

  it("batas jendela: tepat di awal putaran berikutnya masuk putaran berikutnya", () => {
    expect(cari("2026-11-04T10:00:00+07:00")?.putaran).toBe(2);
  });

  it("null di luar shift", () => {
    expect(cari("2026-11-04T07:00:00+07:00")).toBeNull();
    expect(cari("2026-11-04T17:00:00+07:00")).toBeNull();
  });

  it("null di celah setelah putaran terakhir bila target lebih pendek dari shift", () => {
    const p = putaranBerjalan({
      rute: { targetPutaran: 1, intervalMenit: 60 },
      shift: SHIFT_PAGI,
      tanggal: "2026-11-04",
      sekarang: wib("2026-11-04T12:00:00+07:00"),
    });
    expect(p).toBeNull();
  });
});
