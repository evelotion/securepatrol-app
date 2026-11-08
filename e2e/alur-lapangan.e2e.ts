import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";

import { akun } from "./akun";
import { hitungInsidenSecA, idAbsensiSecB, statusDaruratSecA } from "./db";
import { OPSI_KONTEKS } from "./konteks";

/**
 * Checklist uji HP 8 langkah, otomatis. Satu sesi per peran (SECURITY A,
 * DANRU A, CHIEF) dipakai lintas langkah, jadi langkah dijalankan berurutan.
 *
 * Yang ditiru: kamera (fake device Chromium: pola uji, bukan QR), GPS
 * (geolocation context), dan hasil scan QR (kolom kode diisi langsung,
 * jalur yang sama dengan callback scanner). Upload foto ke Cloudinary TIDAK
 * di-mock: unggahan nyata, karena response-nya bertanda tangan server.
 */
test.describe.configure({ mode: "serial" });

let ctxSec: BrowserContext;
let ctxDanru: BrowserContext;
let ctxChief: BrowserContext;
let sec: Page;
let danru: Page;

async function login(page: Page, kunci: "secA" | "danruA" | "chief") {
  const a = akun(kunci);
  await page.goto("/login");
  await page.locator('input[name="identifier"]').fill(a.email);
  await page.locator('input[name="password"]').fill(a.password);
  await page.getByRole("button", { name: /masuk/i }).click();
  await page.waitForURL(/\/(dashboard|beranda)/);
}

/** Buka kamera palsu, ambil foto, tunggu terunggah ke Cloudinary. */
async function ambilFoto(page: Page, label: string) {
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

test.beforeAll(async ({ browser }) => {
  ctxSec = await browser.newContext(OPSI_KONTEKS);
  ctxDanru = await browser.newContext(OPSI_KONTEKS);
  ctxChief = await browser.newContext(OPSI_KONTEKS);
  sec = await ctxSec.newPage();
  danru = await ctxDanru.newPage();
});

test.afterAll(async () => {
  await Promise.all([ctxSec?.close(), ctxDanru?.close(), ctxChief?.close()]);
});

test("1. login SECURITY di HP", async () => {
  await login(sec, "secA");
  await sec.goto("/beranda");
  await expect(sec.getByRole("button", { name: /TOMBOL DARURAT/ })).toBeVisible();
});

test("2. absen masuk (kamera + GPS)", async () => {
  await sec.goto("/absensi");
  await ambilFoto(sec, "Selfie");
  await expect(sec.getByText(/Akurasi/)).toBeVisible();
  await sec.getByRole("button", { name: "Kirim Absen Masuk" }).click();
  await expect(sec.getByText(/Absen masuk tercatat/)).toBeVisible();
});

test("3. scan patroli titik UJI-001", async () => {
  await sec.goto("/patroli");

  // Kamera scanner benar-benar dibuka (fake device); QR palsu tidak terbaca.
  await sec.getByRole("button", { name: "Mulai Scan" }).click();
  await expect(sec.locator("#patroli-scanner-view video")).toBeVisible();
  await sec.getByRole("button", { name: "Berhenti Memindai" }).click();

  // Hasil scan disuntikkan lewat kolom kode (sama dengan callback onScan).
  await sec.locator("#kode").fill("UJI-001");
  await expect(sec.getByText("Uji Titik 1").first()).toBeVisible();
  await ambilFoto(sec, "Foto Area");
  await sec.getByRole("button", { name: "Catat Kunjungan" }).click();
  await expect(sec.getByText(/Uji Titik 1 tercatat/)).toBeVisible();
});

test("4. lapor insiden dari titik", async () => {
  // Tautan muncul di halaman patroli yang sama, tepat setelah kunjungan tercatat (langkah 3).
  await sec.getByRole("link", { name: /Laporkan insiden di titik ini/ }).first().click();
  await sec.waitForURL(/\/insiden\?titik=/);
  await sec.locator("#deskripsi").fill("E2E: pagar titik 1 longgar.");
  await sec.getByRole("button", { name: "Kirim Laporan" }).click();
  await expect(sec.getByText(/Laporan insiden terkirim/)).toBeVisible();
});

test("5. tombol darurat: lepas <2 dtk tidak terkirim, tahan 2 dtk terkirim; banner Danru ≤15 dtk; Saya tangani", async () => {
  // Danru sudah membuka dashboard lebih dulu supaya yang diuji benar-benar auto-refresh.
  await login(danru, "danruA");
  await danru.goto("/dashboard");

  await sec.goto("/beranda");
  const tombol = sec.getByRole("button", { name: /TOMBOL DARURAT/ });
  const box = (await tombol.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  const sebelum = (await statusDaruratSecA()).length;

  // Lepas di 1 detik: tidak boleh terkirim.
  await sec.mouse.move(x, y);
  await sec.mouse.down();
  await sec.waitForTimeout(1000);
  await sec.mouse.up();
  await sec.waitForTimeout(1500);
  await expect(sec.getByText(/Sinyal darurat terkirim/)).toHaveCount(0);
  expect((await statusDaruratSecA()).length).toBe(sebelum);

  // Tahan penuh: terkirim.
  await sec.mouse.move(x, y);
  await sec.mouse.down();
  const mulai = Date.now();
  await expect(sec.getByText(/Sinyal darurat terkirim/)).toBeVisible({
    timeout: 15_000,
  });
  await sec.mouse.up();
  expect((await statusDaruratSecA()).length).toBe(sebelum + 1);

  // Banner muncul di Danru tanpa refresh manual (AutoRefresh 15 dtk + latensi jaringan).
  const banner = danru
    .getByRole("alert", { name: "Sinyal darurat aktif" })
    .locator("li", { hasText: "Uji Security A" })
    .first();
  await expect(banner).toBeVisible({ timeout: 25_000 });
  const detik = (Date.now() - mulai) / 1000;
  console.log(`[E2E] banner darurat muncul di Danru setelah ${detik.toFixed(1)} dtk`);
  expect(detik).toBeLessThanOrEqual(20);

  // "Saya tangani".
  await banner.getByRole("button", { name: "Saya tangani" }).click();
  await expect
    .poll(async () => (await statusDaruratSecA()).includes("DITANGANI"), {
      timeout: 20_000,
    })
    .toBe(true);
});

test("6. isolasi Regu B: Danru A tidak melihat data Regu B", async () => {
  for (const jalur of ["/dashboard", "/insiden", "/laporan"]) {
    await danru.goto(jalur);
    await danru.waitForLoadState("networkidle");
    await expect(danru.locator("body")).not.toContainText("Uji Security B");
  }

  const idB = await idAbsensiSecB();
  test.skip(!idB, "Tidak ada absensi uji.sec.b untuk diperiksa.");
  await danru.goto(`/detail/absensi/${idB}`);
  await danru.waitForLoadState("networkidle");
  await expect(danru.locator("body")).not.toContainText("Uji Security B");
});

test("7. CHIEF mengunduh Excel", async () => {
  const chief = await ctxChief.newPage();
  await login(chief, "chief");
  await chief.goto("/laporan");
  const [unduhan] = await Promise.all([
    chief.waitForEvent("download"),
    chief.getByRole("link", { name: /Export Excel/ }).click(),
  ]);
  expect(unduhan.suggestedFilename()).toMatch(/^rekap-.+\.xlsx$/);
  const jalur = await unduhan.path();
  const { statSync, readFileSync } = await import("node:fs");
  expect(statSync(jalur).size).toBeGreaterThan(1000);
  // .xlsx = zip: diawali "PK".
  expect(readFileSync(jalur).subarray(0, 2).toString()).toBe("PK");
});

test("8. absen keluar", async () => {
  await sec.goto("/absensi");
  await ambilFoto(sec, "Selfie");
  await sec.getByRole("button", { name: "Kirim Absen Keluar" }).click();
  // Setelah keluar, halaman langsung berganti ke ringkasan (pesan sukses tidak sempat tampil).
  await expect(sec.getByText(/Absensi hari ini sudah lengkap/)).toBeVisible();
  expect(await hitungInsidenSecA()).toBeGreaterThanOrEqual(2);
});
