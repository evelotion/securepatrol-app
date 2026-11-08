import { expect, type Page } from "@playwright/test";

import { akun } from "./akun";

export async function masuk(
  page: Page,
  kunci: "secA" | "danruA" | "chief" | "admin",
): Promise<void> {
  const a = akun(kunci);
  await page.goto("/login");
  await page.locator('input[name="identifier"]').fill(a.email);
  await page.locator('input[name="password"]').fill(a.password);
  await page.getByRole("button", { name: /masuk/i }).click();
  await page.waitForURL(/\/(dashboard|beranda)/);
}

/** Buka kamera palsu, ambil foto, tunggu terunggah ke Cloudinary. */
export async function ambilFoto(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: "Buka Kamera" }).click();
  // Tunggu frame video pertama; tanpa ini tombol ambil bisa ditekan sebelum kamera siap.
  await page.waitForFunction(() => {
    const v = document.querySelector("video");
    return !!v && v.videoWidth > 0 && v.readyState >= 2;
  });
  await page.getByRole("button", { name: `Ambil ${label}`, exact: true }).click();
  await expect(page.getByText(`${label} tersimpan`)).toBeVisible({
    timeout: 60_000,
  });
}
