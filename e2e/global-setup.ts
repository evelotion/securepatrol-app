import { bersihkanJejakE2E } from "./db";

/** Setup: bersihkan sisa jejak; teardown (fungsi yang dikembalikan): bersihkan lagi. */
export default async function globalSetup(): Promise<() => Promise<void>> {
  await bersihkanJejakE2E();
  return async () => {
    await bersihkanJejakE2E();
  };
}
