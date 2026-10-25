/** Format waktu/tanggal lokal (WIB) — aman dipakai client & server. */

const JAM = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
});

const TANGGAL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const LENGKAP = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "14:03" */
export function formatJam(value: string | Date): string {
  return JAM.format(typeof value === "string" ? new Date(value) : value);
}

/** "25 Okt 2026" */
export function formatTanggal(value: string | Date): string {
  return TANGGAL.format(typeof value === "string" ? new Date(value) : value);
}

/** "25 Okt, 14:03" */
export function formatDateTime(value: string | Date): string {
  return LENGKAP.format(typeof value === "string" ? new Date(value) : value);
}
