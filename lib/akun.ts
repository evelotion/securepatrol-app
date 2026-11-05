/** Aturan password baru (F4-8) — murni, tanpa DB, supaya mudah diuji. */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAKS = 128;

export function validasiPasswordBaru(input: {
  lama: string;
  baru: string;
  konfirmasi: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (input.lama === "") errors.lama = "Password lama wajib diisi.";
  if (input.baru.length < PASSWORD_MIN) {
    errors.baru = `Password baru minimal ${PASSWORD_MIN} karakter.`;
  } else if (input.baru.length > PASSWORD_MAKS) {
    errors.baru = `Password baru maksimal ${PASSWORD_MAKS} karakter.`;
  } else if (input.baru === input.lama) {
    errors.baru = "Password baru harus berbeda dari password lama.";
  }
  if (input.konfirmasi !== input.baru) {
    errors.konfirmasi = "Konfirmasi password tidak sama.";
  }

  return errors;
}

/**
 * Apakah password yang diubah admin lewat Master User harus diganti lagi oleh
 * pemiliknya. Ya bila yang mengubah orang lain (admin tahu password-nya);
 * tidak bila admin mengubah password dirinya sendiri — ia sendiri yang
 * memilihnya, jadi tidak perlu dipaksa ganti lagi.
 */
export function wajibGantiSetelahUbahPassword(
  aktorId: string,
  targetId: string,
): boolean {
  return aktorId !== targetId;
}
