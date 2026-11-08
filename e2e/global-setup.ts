import { bersihkanJejakE2E } from "./db";

/** Setup: bersihkan sisa jejak; teardown (fungsi yang dikembalikan): bersihkan lagi. */
export default async function globalSetup(): Promise<() => Promise<void>> {
  await bersihkanJejakE2E();
  return async () => {
    // E2E_SIMPAN_DATA=1: biarkan data uji tetap ada (mis. untuk mengambil contoh Excel).
    if (process.env.E2E_SIMPAN_DATA === "1") return;
    await bersihkanJejakE2E();
  };
}
