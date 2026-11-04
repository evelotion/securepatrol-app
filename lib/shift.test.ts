import { describe, expect, it } from "vitest";

import {
  awalPekan,
  formatMenit,
  hariPekan,
  jendelaShift,
  parseJam,
  statusKeluar,
  statusMasuk,
  tambahHari,
  tanggalDB,
  tanggalDariDB,
  type ShiftJam,
} from "./shift";

const wib = (iso: string): Date => new Date(iso);

const SHIFT_PAGI: ShiftJam = {
  nama: "Pagi",
  jamMulai: "08:00",
  jamSelesai: "16:00",
  toleransiTelatMenit: 15,
};

const SHIFT_MALAM: ShiftJam = {
  nama: "Malam",
  jamMulai: "22:00",
  jamSelesai: "06:00",
  toleransiTelatMenit: 15,
};

describe("parseJam & formatMenit", () => {
  it("membaca HH:MM menjadi menit sejak 00:00", () => {
    expect(parseJam("00:00")).toBe(0);
    expect(parseJam("08:15")).toBe(495);
    expect(parseJam("22:00")).toBe(1320);
    expect(parseJam("23:59")).toBe(1439);
  });

  it("menolak format yang tidak valid", () => {
    expect(parseJam("24:00")).toBeNull();
    expect(parseJam("8:00")).toBeNull();
    expect(parseJam("08:60")).toBeNull();
    expect(parseJam("")).toBeNull();
  });

  it("format bolak-balik tetap sama", () => {
    expect(formatMenit(parseJam("22:00")!)).toBe("22:00");
    expect(formatMenit(parseJam("00:05")!)).toBe("00:05");
    expect(formatMenit(1440)).toBe("00:00");
  });
});

describe("tanggal DATE tanpa geser zona waktu", () => {
  it("YYYY-MM-DD <-> Date kolom DATE", () => {
    expect(tanggalDB("2026-11-04").toISOString()).toBe(
      "2026-11-04T00:00:00.000Z",
    );
    expect(tanggalDariDB(tanggalDB("2026-11-04"))).toBe("2026-11-04");
    // 00:30 WIB tanggal 5 masih 4 Nov UTC — tidak boleh ikut bergeser.
    expect(tanggalDB("2026-11-05").toISOString()).toBe(
      "2026-11-05T00:00:00.000Z",
    );
  });

  it("awal pekan adalah hari Senin", () => {
    // 4 Nov 2026 = Rabu, pekannya mulai Senin 2 Nov.
    expect(awalPekan("2026-11-04")).toBe("2026-11-02");
    expect(awalPekan("2026-11-02")).toBe("2026-11-02");
    // 8 Nov 2026 = Minggu, masih pekan yang sama.
    expect(awalPekan("2026-11-08")).toBe("2026-11-02");
    expect(awalPekan("2026-11-09")).toBe("2026-11-09");
  });

  it("hariPekan mengembalikan tujuh hari Senin–Minggu", () => {
    expect(hariPekan("2026-11-04")).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
    expect(tambahHari("2026-10-31", 1)).toBe("2026-11-01");
    expect(tambahHari("2026-11-01", -1)).toBe("2026-10-31");
  });
});

describe("jendelaShift", () => {
  it("shift pagi 08:00–16:00 WIB", () => {
    const jendela = jendelaShift("2026-11-04", SHIFT_PAGI)!;
    expect(jendela.mulai.toISOString()).toBe("2026-11-04T01:00:00.000Z");
    expect(jendela.selesai.toISOString()).toBe("2026-11-04T09:00:00.000Z");
  });

  it("shift malam 22:00–06:00 berakhir besoknya", () => {
    const jendela = jendelaShift("2026-11-04", SHIFT_MALAM)!;
    expect(jendela.mulai.toISOString()).toBe("2026-11-04T15:00:00.000Z");
    // 06:00 WIB tanggal 5 = 23:00 UTC tanggal 4.
    expect(jendela.selesai.toISOString()).toBe("2026-11-04T23:00:00.000Z");

    const durasi = jendela.selesai.getTime() - jendela.mulai.getTime();
    expect(durasi).toBe(8 * 60 * 60 * 1000);
  });

  it("null bila jam tidak valid", () => {
    expect(
      jendelaShift("2026-11-04", { ...SHIFT_PAGI, jamMulai: "8:00" }),
    ).toBeNull();
  });
});

describe("statusMasuk", () => {
  it("tepat waktu bila masih dalam toleransi", () => {
    expect(
      statusMasuk(wib("2026-11-04T08:10:00+07:00"), SHIFT_PAGI, "2026-11-04"),
    ).toBe("TEPAT_WAKTU");
    expect(
      statusMasuk(wib("2026-11-04T08:15:00+07:00"), SHIFT_PAGI, "2026-11-04"),
    ).toBe("TEPAT_WAKTU");
  });

  it("TELAT bila melewati toleransi 15 menit (kriteria Fase 4)", () => {
    expect(
      statusMasuk(wib("2026-11-04T08:16:00+07:00"), SHIFT_PAGI, "2026-11-04"),
    ).toBe("TELAT");
    expect(
      statusMasuk(wib("2026-11-04T08:20:00+07:00"), SHIFT_PAGI, "2026-11-04"),
    ).toBe("TELAT");
  });

  it("shift malam: masuk 22:05 tetap tepat waktu", () => {
    expect(
      statusMasuk(wib("2026-11-04T22:05:00+07:00"), SHIFT_MALAM, "2026-11-04"),
    ).toBe("TEPAT_WAKTU");
  });
});

describe("statusKeluar", () => {
  it("pulang sebelum jam selesai shift -> PULANG_CEPAT", () => {
    expect(
      statusKeluar(
        "TEPAT_WAKTU",
        wib("2026-11-04T15:30:00+07:00"),
        SHIFT_PAGI,
        "2026-11-04",
      ),
    ).toBe("PULANG_CEPAT");
  });

  it("pulang tepat/lebih dari jam selesai mempertahankan status awal", () => {
    expect(
      statusKeluar(
        "TEPAT_WAKTU",
        wib("2026-11-04T16:00:00+07:00"),
        SHIFT_PAGI,
        "2026-11-04",
      ),
    ).toBe("TEPAT_WAKTU");
  });

  it("TELAT tidak tertimpa PULANG_CEPAT", () => {
    expect(
      statusKeluar(
        "TELAT",
        wib("2026-11-04T14:00:00+07:00"),
        SHIFT_PAGI,
        "2026-11-04",
      ),
    ).toBe("TELAT");
  });

  it("shift malam: keluar 05:30 WIB besoknya -> PULANG_CEPAT", () => {
    expect(
      statusKeluar(
        "TEPAT_WAKTU",
        wib("2026-11-05T05:30:00+07:00"),
        SHIFT_MALAM,
        "2026-11-04",
      ),
    ).toBe("PULANG_CEPAT");
  });
});
