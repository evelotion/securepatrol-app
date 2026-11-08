import { expect, test } from "@playwright/test";

import { ambilFoto, masuk } from "./bantu";
import { bersihkanJejakE2E } from "./db";
import {
  bersihkanRuteE2E,
  logPatroliSecA,
  siapkanTitikTanpaRuteE2E,
} from "./fixture-rute";

/**
 * Fallback anti titik palsu: petugas TANPA rute/jadwal aktif tetap dikenai jeda
 * global (PATROL_MIN_JEDA_DETIK, bawaan 30 dtk) antar scan ke titik berbeda.
 */
test.beforeAll(async () => {
  await bersihkanJejakE2E();
  await siapkanTitikTanpaRuteE2E(); // titik UJI-002, tanpa rute dan tanpa jadwal
});

test.afterAll(async () => {
  if (process.env.E2E_SIMPAN_DATA !== "1") await bersihkanRuteE2E();
});

test("tanpa rute/jadwal: scan ke titik lain <30 dtk -> TIDAK_VALID terlalu cepat", async ({
  page,
}) => {
  await masuk(page, "secA");
  await page.goto("/absensi");
  await ambilFoto(page, "Selfie");
  await page.getByRole("button", { name: "Kirim Absen Masuk" }).click();
  await expect(page.getByText(/Absen masuk tercatat/)).toBeVisible();

  for (const kode of ["UJI-001", "UJI-002"]) {
    await page.goto("/patroli");
    await page.locator("#kode").fill(kode);
    await ambilFoto(page, "Foto Area");
    await page.getByRole("button", { name: "Catat Kunjungan" }).click();
    await expect(page.getByText(/tercatat pukul/)).toBeVisible();
  }

  const [pertama, kedua] = await logPatroliSecA();
  expect(pertama.alasan ?? "").not.toMatch(/terlalu cepat/);
  expect(kedua.namaTitik).toBe("Uji Titik 2");
  expect(kedua.status).toBe("TIDAK_VALID");
  expect(kedua.alasan).toMatch(/^terlalu cepat dari titik sebelumnya/);
});
