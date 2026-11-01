/** Format waktu/tanggal lokal (WIB) — aman dipakai client & server. */

import { ZONA_WIB } from "@/lib/waktu";

// Zona eksplisit: jam server (UTC) tidak boleh ikut menentukan tampilan.
const JAM = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA_WIB,
  hour: "2-digit",
  minute: "2-digit",
});

const JAM_DETIK = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA_WIB,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const TANGGAL = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA_WIB,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const LENGKAP = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA_WIB,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "14:03" */
export function formatJam(value: string | Date): string {
  return JAM.format(typeof value === "string" ? new Date(value) : value);
}

/** "14:03:27" */
export function formatJamDetik(value: string | Date): string {
  return JAM_DETIK.format(typeof value === "string" ? new Date(value) : value);
}

/** "25 Okt 2026" */
export function formatTanggal(value: string | Date): string {
  return TANGGAL.format(typeof value === "string" ? new Date(value) : value);
}

/** "25 Okt, 14:03" */
export function formatDateTime(value: string | Date): string {
  return LENGKAP.format(typeof value === "string" ? new Date(value) : value);
}
