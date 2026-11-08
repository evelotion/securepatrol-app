import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { ambilFoto, masuk } from "./bantu";
import { bersihkanJejakE2E } from "./db";
import {
  bersihkanRuteE2E,
  logPatroliSecA,
  siapkanRuteE2E,
} from "./fixture-rute";
import { OPSI_KONTEKS } from "./konteks";

/**
 * Anti titik palsu: scan titik kedua terlalu cepat dari titik pertama dalam
 * satu putaran -> TIDAK_VALID, dan muncul di panel "Scan mencurigakan" Danru.
 * Fixture (rute UJI-001 -> UJI-002 -> UJI-003, jadwal hari ini) dibuat dan
 * dihapus oleh tes ini; hanya menyentuh data uji.
 */
test.describe.configure({ mode: "serial" });

let ctxSec: BrowserContext;
let ctxDanru: BrowserContext;
let ctxChief: BrowserContext;
let ctxAdmin: BrowserContext;
let sec: Page;

async function scan(page: Page, kode: string) {
  await page.goto("/patroli");
  await page.locator("#kode").fill(kode);
  await ambilFoto(page, "Foto Area");
  await page.getByRole("button", { name: "Catat Kunjungan" }).click();
}

test.beforeAll(async ({ browser }) => {
  await bersihkanJejakE2E();
  await siapkanRuteE2E();
  ctxSec = await browser.newContext(OPSI_KONTEKS);
  ctxDanru = await browser.newContext(OPSI_KONTEKS);
  ctxChief = await browser.newContext(OPSI_KONTEKS);
  ctxAdmin = await browser.newContext(OPSI_KONTEKS);
  sec = await ctxSec.newPage();

  await masuk(sec, "secA");
  await sec.goto("/absensi");
  await ambilFoto(sec, "Selfie");
  await sec.getByRole("button", { name: "Kirim Absen Masuk" }).click();
  await expect(sec.getByText(/Absen masuk tercatat/)).toBeVisible();
});

test.afterAll(async () => {
  await Promise.all([
    ctxSec?.close(),
    ctxDanru?.close(),
    ctxChief?.close(),
    ctxAdmin?.close(),
  ]);
  // Teardown global hanya membersihkan jejak sec.a; fixture rute dibersihkan di sini.
  if (process.env.E2E_SIMPAN_DATA !== "1") await bersihkanRuteE2E();
});

test("foto hanya dari kamera: tidak ada input file di halaman lapangan", async () => {
  for (const jalur of ["/absensi", "/patroli", "/insiden"]) {
    await sec.goto(jalur);
    await expect(sec.locator('input[type="file"]')).toHaveCount(0);
  }
});

test("scan titik pertama di putaran tidak dianggap terlalu cepat", async () => {
  await scan(sec, "UJI-001");
  await expect(sec.getByText(/Uji Titik 1 tercatat/)).toBeVisible();
  const [log] = await logPatroliSecA();
  expect(log.alasan ?? "").not.toMatch(/terlalu cepat/);
});

test("scan titik kedua <60 dtk -> TIDAK_VALID 'terlalu cepat dari titik sebelumnya'", async () => {
  await scan(sec, "UJI-002");
  await expect(sec.getByText(/Uji Titik 2 tercatat.*tidak valid/)).toBeVisible();

  const log = (await logPatroliSecA()).find((l) => l.namaTitik === "Uji Titik 2");
  expect(log?.status).toBe("TIDAK_VALID");
  expect(log?.alasan).toMatch(/^terlalu cepat dari titik sebelumnya/);
});

test("titik dengan batas waktu tempuh 0 (dimatikan admin) tidak ditandai terlalu cepat", async () => {
  await scan(sec, "UJI-003");
  await expect(sec.getByText(/Uji Titik 3 tercatat/)).toBeVisible();
  const log = (await logPatroliSecA()).find((l) => l.namaTitik === "Uji Titik 3");
  expect(log?.status).not.toBe("TIDAK_VALID");
  expect(log?.alasan ?? "").not.toMatch(/terlalu cepat/);
});

test("panel Scan mencurigakan di Dashboard Danru A menaut ke detail + foto", async () => {
  const danru = await ctxDanru.newPage();
  await masuk(danru, "danruA");
  await danru.goto("/dashboard");

  const panel = danru.locator('[aria-label="Scan mencurigakan"]');
  await expect(panel).toBeVisible();
  const baris = panel.locator("li", { hasText: "Uji Security A" }).first();
  await expect(baris).toContainText("1 terlalu cepat");

  // Isolasi regu: data Regu B tidak muncul di panel Danru A.
  await expect(panel).not.toContainText("Uji Security B");

  await baris.locator("summary").click();
  await baris
    .getByRole("link", { name: /Detail & foto/ })
    .first()
    .click();
  await danru.waitForURL(/\/detail\/patroli\//);
  await expect(danru.locator("body")).toContainText("Uji Titik");
  await expect(danru.locator("img").first()).toBeVisible();
});

test("panel yang sama tampil di Laporan (Chief) sesuai rentang", async () => {
  const chief = await ctxChief.newPage();
  await masuk(chief, "chief");
  await chief.goto("/laporan");
  const panel = chief.locator('[aria-label="Scan mencurigakan"]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Uji Security A");
  await expect(panel).toContainText("terlalu cepat");
});

test("Master Rute memuat waktu tempuh minimum per titik", async () => {
  const admin = await ctxAdmin.newPage();
  await masuk(admin, "admin");
  await admin.goto("/master/rute");
  const kartu = admin.locator("li", { hasText: "E2E Anti Titik Palsu" }).first();
  await kartu.getByRole("button", { name: "Edit" }).click();
  const batas = admin.locator('input[name^="min_"]');
  await expect(batas.first()).toBeVisible();
  const nilai = await batas.evaluateAll((els) =>
    els.map((e) => (e as HTMLInputElement).value),
  );
  // Rute memakai 60, 60, 0; titik lain di master bernilai bawaan 60.
  expect(nilai).toContain("0");
  expect(nilai).toContain("60");
});

test("hak cipta tampil di halaman login dan Profil", async ({ browser }) => {
  const ctx = await browser.newContext(OPSI_KONTEKS);
  const p = await ctx.newPage();
  await p.goto("/login");
  await expect(p.getByText("© 2026 Indra Dwi Ananda")).toBeVisible();
  await ctx.close();

  await sec.goto("/profil");
  await expect(sec.getByText("© 2026 Indra Dwi Ananda").last()).toBeVisible();
});
