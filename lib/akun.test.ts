import { describe, expect, it } from "vitest";

import { validasiPasswordBaru, wajibGantiSetelahUbahPassword } from "./akun";

describe("validasiPasswordBaru", () => {
  it("lolos bila semua benar", () => {
    expect(
      validasiPasswordBaru({ lama: "lama-123", baru: "baru-12345", konfirmasi: "baru-12345" }),
    ).toEqual({});
  });

  it("menolak password lama kosong", () => {
    expect(
      validasiPasswordBaru({ lama: "", baru: "baru-12345", konfirmasi: "baru-12345" }).lama,
    ).toBeDefined();
  });

  it("menolak password baru pendek atau sama dengan yang lama", () => {
    expect(
      validasiPasswordBaru({ lama: "x", baru: "pendek", konfirmasi: "pendek" }).baru,
    ).toBeDefined();
    expect(
      validasiPasswordBaru({ lama: "samasama12", baru: "samasama12", konfirmasi: "samasama12" }).baru,
    ).toBeDefined();
  });

  it("menolak konfirmasi yang berbeda", () => {
    expect(
      validasiPasswordBaru({ lama: "lama-123", baru: "baru-12345", konfirmasi: "baru-99999" })
        .konfirmasi,
    ).toBeDefined();
  });
});

describe("wajibGantiSetelahUbahPassword", () => {
  it("wajib ganti bila admin mengubah password orang lain", () => {
    expect(wajibGantiSetelahUbahPassword("admin-1", "user-9")).toBe(true);
  });

  it("tidak wajib bila admin mengubah password dirinya sendiri", () => {
    expect(wajibGantiSetelahUbahPassword("admin-1", "admin-1")).toBe(false);
  });
});
