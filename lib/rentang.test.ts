import { describe, expect, it } from "vitest";

import { hariAntara, isTanggalValid, parseRentang } from "./rentang";

// 5 Nov 2026 10:00 WIB
const SEKARANG = new Date("2026-11-05T03:00:00Z");
const OPSI = { hariBawaan: 7, hariMaks: 93, sekarang: SEKARANG };

describe("isTanggalValid", () => {
  it("menolak format salah dan tanggal tidak ada", () => {
    expect(isTanggalValid("2026-11-05")).toBe(true);
    expect(isTanggalValid("2026-02-30")).toBe(false);
    expect(isTanggalValid("5-11-2026")).toBe(false);
    expect(isTanggalValid(undefined)).toBe(false);
  });
});

describe("parseRentang", () => {
  it("tanpa input memakai 7 hari terakhir tanpa galat", () => {
    expect(parseRentang(undefined, undefined, OPSI)).toEqual({
      dari: "2026-10-30",
      sampai: "2026-11-05",
      error: null,
    });
  });

  it("menerima rentang valid", () => {
    expect(parseRentang("2026-10-01", "2026-10-31", OPSI)).toEqual({
      dari: "2026-10-01",
      sampai: "2026-10-31",
      error: null,
    });
  });

  it("menolak terbalik, format salah, dan terlalu panjang", () => {
    expect(parseRentang("2026-11-05", "2026-11-01", OPSI).error).not.toBeNull();
    expect(parseRentang("abc", "2026-11-01", OPSI).error).not.toBeNull();
    expect(parseRentang("2026-01-01", "2026-11-01", OPSI).error).not.toBeNull();
  });

  it("hanya mengisi satu sisi", () => {
    expect(parseRentang(undefined, "2026-11-01", OPSI)).toMatchObject({
      dari: "2026-10-26",
      sampai: "2026-11-01",
      error: null,
    });
  });
});

describe("hariAntara", () => {
  it("inklusif", () => {
    expect(hariAntara("2026-11-01", "2026-11-01")).toBe(1);
    expect(hariAntara("2026-10-30", "2026-11-05")).toBe(7);
  });
});
