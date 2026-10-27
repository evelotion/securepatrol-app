import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/**
 * Hash dummy untuk timing attack (F1-3): saat user tidak ditemukan,
 * verifikasi tetap dijalankan terhadap hash ini supaya waktu respons
 * tidak membocorkan email terdaftar atau tidak.
 * Format sama dengan hash nyata (`salt:hash`) — tidak pernah cocok.
 */
export const DUMMY_PASSWORD_HASH =
  "ae16916956b5a404381d484553405b69:f12d4893da0cdaeebcf4a62e0298454ab64d28312cb13f72f788f23fda44d12abe0153ee4bfd647d4ca1d3fa9d82ea64d204c165a88d116246fab8fc48b14906";

/**
 * Hash password dengan scrypt + salt acak.
 * Format tersimpan: `<salt-hex>:<hash-hex>`
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `${salt}:${hash.toString("hex")}`;
}

/** Verifikasi password terhadap hash tersimpan secara constant-time. */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const actual = scryptSync(password, salt, KEY_LENGTH);
  return timingSafeEqual(expected, actual);
}
