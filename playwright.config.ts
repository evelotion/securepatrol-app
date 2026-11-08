import { defineConfig } from "@playwright/test";

import { BASE_URL, OPSI_KONTEKS } from "./e2e/konteks";

/**
 * E2E mobile (Chromium, viewport HP) dengan kamera palsu dan GPS tiruan.
 * Target lewat BASE_URL (default: dev server lokal). Lihat README bagian E2E.
 */
const lokal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...OPSI_KONTEKS,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
  },
  projects: [{ name: "chromium-mobile" }],
  webServer: lokal
    ? {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
