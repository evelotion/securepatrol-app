import { expect, test } from "@playwright/test";

import { akun } from "./akun";
import { OPSI_KONTEKS } from "./konteks";

/**
 * Form checkpoint (SUPER_ADMIN): pengisian koordinat tanpa mengetik angka.
 * Tidak menyimpan apa pun — form hanya dibuka lalu ditutup, jadi tidak ada
 * data yang perlu dibersihkan.
 */
test("form checkpoint: GPS, peta, dan tautan Google Maps mengisi koordinat", async ({
  browser,
}) => {
  const ctx = await browser.newContext(OPSI_KONTEKS);
  const page = await ctx.newPage();
  const a = akun("admin");

  await page.goto("/login");
  await page.locator('input[name="identifier"]').fill(a.email);
  await page.locator('input[name="password"]').fill(a.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(/\/dashboard/);

  await page.goto("/master/checkpoints");
  await page.getByRole("button", { name: /Tambah/ }).first().click();

  // Peta termuat (kontainer Leaflet) dan teks bantuan untuk admin awam tampil.
  await expect(page.getByTestId("peta-pemilih")).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.getByText(/Berdiri di titik ini lalu tekan/)).toBeVisible();

  // Bagian manual tertutup secara bawaan.
  await expect(page.locator("#lat")).toBeHidden();

  // a. Pakai lokasi saya: 5 sampel, akurasi tampil (geolokasi tiruan ±10 m).
  await page.getByRole("button", { name: "Pakai lokasi saya sekarang" }).click();
  await expect(page.getByText(/akurasi ±10 m/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".peta-pin")).toBeVisible();
  await expect(page.locator("path.leaflet-interactive")).toBeVisible(); // lingkaran radius

  // Radius per titik: lingkaran mengikuti nilai; nilai di luar batas ditolak.
  const lingkaran = page.locator("path.leaflet-interactive");
  const lebarBawaan = (await lingkaran.boundingBox())!.width;
  await page.locator("#radiusM").fill("5");
  await expect(page.getByText(/Radius harus bilangan bulat 10–1000/)).toBeVisible();
  await page.locator("#radiusM").fill("30");
  await expect(page.getByText(/Radius harus bilangan bulat/)).toHaveCount(0);
  await expect
    .poll(async () => (await lingkaran.boundingBox())!.width)
    .toBeLessThan(lebarBawaan);

  await page.getByText("Atur manual").click();
  await expect(page.locator("#lat")).toHaveValue(/^-6\.2000/);
  await expect(page.locator("#long")).toHaveValue(/^106\.8166/);

  // c. Tempel tautan Google Maps (@lat,long) menimpa koordinat.
  await page
    .locator("#tautanMaps")
    .fill("https://www.google.com/maps/place/Monas/@-6.1753924,106.8271528,17z");
  await expect(page.getByText("Koordinat diambil dari tautan.")).toBeVisible();
  await expect(page.locator("#lat")).toHaveValue("-6.1753924");
  await expect(page.locator("#long")).toHaveValue("106.8271528");

  // Tautan tanpa koordinat ditolak dengan pesan jelas.
  await page.locator("#tautanMaps").fill("https://maps.app.goo.gl/abc123");
  await expect(page.getByText(/Koordinat tidak ditemukan/)).toBeVisible();

  // b. Klik peta memindahkan pin.
  const peta = page.getByTestId("peta-pemilih");
  const kotak = (await peta.boundingBox())!;
  await page.mouse.click(kotak.x + kotak.width * 0.7, kotak.y + kotak.height * 0.3);
  await expect(page.locator("#lat")).not.toHaveValue("-6.1753924");

  await ctx.close();
});
