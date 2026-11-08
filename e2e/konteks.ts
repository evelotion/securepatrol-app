import { devices, type BrowserContextOptions } from "@playwright/test";

export const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

/** Konteks HP: Pixel 7, lokasi tiruan, izin kamera + GPS (dipakai config dan tes). */
export const OPSI_KONTEKS: BrowserContextOptions = {
  ...devices["Pixel 7"],
  baseURL: BASE_URL,
  geolocation: { latitude: -6.2, longitude: 106.816666, accuracy: 10 },
  permissions: ["camera", "geolocation"],
  locale: "id-ID",
  timezoneId: "Asia/Jakarta",
  acceptDownloads: true,
};
