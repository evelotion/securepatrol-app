import { describe, expect, it } from "vitest";

import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "./password";

describe("hashPassword", () => {
  it("menghasilkan format salt-hex:hash-hex (salt 16 byte, hash 64 byte)", () => {
    const stored = hashPassword("Rahasia123!");
    const [salt, hash] = stored.split(":");

    expect(stored).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    expect(salt).toHaveLength(32); // 16 byte -> hex
    expect(hash).toHaveLength(128); // 64 byte -> hex
  });

  it("salt acak — hash dua kali untuk password sama selalu berbeda", () => {
    expect(hashPassword("Rahasia123!")).not.toBe(hashPassword("Rahasia123!"));
  });

  it("hash tidak memuat password plaintext", () => {
    expect(hashPassword("Rahasia123!")).not.toContain("Rahasia123!");
  });
});

describe("verifyPassword", () => {
  it("cocok untuk password yang benar", () => {
    const stored = hashPassword("KataSandi1234");
    expect(verifyPassword("KataSandi1234", stored)).toBe(true);
  });

  it("tidak cocok untuk password salah", () => {
    const stored = hashPassword("KataSandi1234");
    expect(verifyPassword("KataSandi1235", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("case-sensitive", () => {
    const stored = hashPassword("KataSandi1234");
    expect(verifyPassword("katasandi1234", stored)).toBe(false);
  });

  it("hash rusak / format salah ditolak tanpa throw", () => {
    expect(verifyPassword("apa", "bukan-hash")).toBe(false);
    expect(verifyPassword("apa", "")).toBe(false);
    expect(verifyPassword("apa", "abc:def")).toBe(false);
    // salt hex tapi hash bukan 64 byte
    expect(verifyPassword("apa", "ae16916956b5a404381d484553405b69:abcd")).toBe(
      false,
    );
  });

  it("hash gagal dimodifikasi sedikit pun membuat verifikasi gagal", () => {
    const stored = hashPassword("KataSandi1234");
    const [salt, hash] = stored.split(":");
    const rusak = `${salt}:${hash.slice(0, -1)}${hash.endsWith("0") ? "1" : "0"}`;
    expect(verifyPassword("KataSandi1234", rusak)).toBe(false);
  });
});

describe("DUMMY_PASSWORD_HASH (F1-3 — penangkal timing attack)", () => {
  it("format valid sehingga scrypt tetap dijalankan saat user tidak ada", () => {
    const [salt, hash] = DUMMY_PASSWORD_HASH.split(":");
    expect(salt).toHaveLength(32);
    expect(hash).toHaveLength(128);
  });

  it("tidak pernah cocok dengan password apa pun", () => {
    expect(verifyPassword("Admin123!", DUMMY_PASSWORD_HASH)).toBe(false);
    expect(verifyPassword("", DUMMY_PASSWORD_HASH)).toBe(false);
    expect(
      verifyPassword("ae16916956b5a404381d484553405b69", DUMMY_PASSWORD_HASH),
    ).toBe(false);
  });
});