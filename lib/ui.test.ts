import { describe, expect, it } from "vitest";

import {
  labelStatusScan,
  persenProgres,
  shiftDariJam,
  toneAkurasi,
} from "./ui";

describe("shiftDariJam", () => {
  it("memetakan jam WIB ke label shift", () => {
    expect(shiftDariJam(6)).toBe("Shift Pagi");
    expect(shiftDariJam(13)).toBe("Shift Pagi");
    expect(shiftDariJam(14)).toBe("Shift Siang");
    expect(shiftDariJam(17)).toBe("Shift Siang");
    expect(shiftDariJam(18)).toBe("Shift Malam");
    expect(shiftDariJam(22)).toBe("Shift Malam");
    expect(shiftDariJam(5)).toBe("Shift Malam");
  });
});

describe("toneAkurasi", () => {
  it("hijau hingga 20 m, kuning hingga 50 m, merah di atasnya", () => {
    expect(toneAkurasi(8)).toBe("ok");
    expect(toneAkurasi(20)).toBe("ok");
    expect(toneAkurasi(21)).toBe("warn");
    expect(toneAkurasi(50)).toBe("warn");
    expect(toneAkurasi(51)).toBe("bad");
    expect(toneAkurasi(null)).toBe("neutral");
  });
});

describe("persenProgres", () => {
  it("membulatkan dan membatasi 0–100", () => {
    expect(persenProgres(0, 12)).toBe(0);
    expect(persenProgres(5, 12)).toBe(42);
    expect(persenProgres(12, 12)).toBe(100);
    expect(persenProgres(1, 0)).toBe(0);
    expect(persenProgres(20, 12)).toBe(100);
  });
});

describe("labelStatusScan", () => {
  it("memberi teks dan tone untuk tiap status", () => {
    expect(labelStatusScan("VALID")).toEqual({ label: "Valid", tone: "ok" });
    expect(labelStatusScan("BELUM_TERVERIFIKASI")).toEqual({
      label: "Belum terverifikasi",
      tone: "warn",
    });
    expect(labelStatusScan("TIDAK_VALID")).toEqual({
      label: "Tidak valid",
      tone: "bad",
    });
    expect(labelStatusScan(null).tone).toBe("neutral");
  });
});
