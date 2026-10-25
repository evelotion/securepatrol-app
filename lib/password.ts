import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

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
