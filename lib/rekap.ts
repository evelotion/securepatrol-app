/**
 * Rekap kehadiran & patroli (F4-7) — fungsi murni di atas hasil agregasi DB,
 * jadi mudah diuji tanpa database.
 */

export type Orang = { id: string; nama: string; regu: string | null };

export type StatusHadirRekap = "TEPAT_WAKTU" | "TELAT" | "PULANG_CEPAT" | "TIDAK_HADIR";
export type StatusScanRekap = "VALID" | "TIDAK_VALID" | "BELUM_TERVERIFIKASI";

/** Hasil `groupBy` absensi per user & status (status null = hadir tanpa jadwal). */
export type AgregatAbsensi = {
  userId: string;
  statusHadir: StatusHadirRekap | null;
  jumlah: number;
};

/** Hasil `groupBy` patroli per user, titik, & status. */
export type AgregatPatroli = {
  userId: string;
  checkpointId: string;
  status: StatusScanRekap;
  jumlah: number;
};

export type RekapKehadiranRow = Orang & {
  /** Semua hari masuk kerja = tepat waktu + telat + pulang cepat + tanpa jadwal. */
  hadir: number;
  tepatWaktu: number;
  telat: number;
  pulangCepat: number;
  tanpaJadwal: number;
  tidakHadir: number;
};

export type RekapPatroliRow = Orang & {
  scan: number;
  valid: number;
  tidakValid: number;
  belumTerverifikasi: number;
  titikUnik: number;
  /** Persen titik aktif yang pernah dipindai orang ini dalam rentang. */
  persenTitik: number;
};

function urutkan<T extends Orang>(rows: T[]): T[] {
  return rows.sort(
    (a, b) =>
      (a.regu ?? "￿").localeCompare(b.regu ?? "￿") || a.nama.localeCompare(b.nama),
  );
}

export function rekapKehadiran(
  orang: Orang[],
  agregat: AgregatAbsensi[],
): RekapKehadiranRow[] {
  const peta = new Map<string, RekapKehadiranRow>(
    orang.map((o) => [
      o.id,
      { ...o, hadir: 0, tepatWaktu: 0, telat: 0, pulangCepat: 0, tanpaJadwal: 0, tidakHadir: 0 },
    ]),
  );

  for (const a of agregat) {
    const row = peta.get(a.userId);
    if (!row) continue;
    if (a.statusHadir === "TIDAK_HADIR") {
      row.tidakHadir += a.jumlah;
      continue;
    }
    row.hadir += a.jumlah;
    if (a.statusHadir === "TEPAT_WAKTU") row.tepatWaktu += a.jumlah;
    else if (a.statusHadir === "TELAT") row.telat += a.jumlah;
    else if (a.statusHadir === "PULANG_CEPAT") row.pulangCepat += a.jumlah;
    else row.tanpaJadwal += a.jumlah;
  }

  return urutkan([...peta.values()]);
}

export function persen(bagian: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((bagian / total) * 100));
}

export function rekapPatroli(
  orang: Orang[],
  agregat: AgregatPatroli[],
  totalTitikAktif: number,
): RekapPatroliRow[] {
  const peta = new Map<string, RekapPatroliRow>();
  const titik = new Map<string, Set<string>>();
  for (const o of orang) {
    peta.set(o.id, {
      ...o,
      scan: 0,
      valid: 0,
      tidakValid: 0,
      belumTerverifikasi: 0,
      titikUnik: 0,
      persenTitik: 0,
    });
    titik.set(o.id, new Set());
  }

  for (const a of agregat) {
    const row = peta.get(a.userId);
    if (!row) continue;
    row.scan += a.jumlah;
    if (a.status === "VALID") row.valid += a.jumlah;
    else if (a.status === "TIDAK_VALID") row.tidakValid += a.jumlah;
    else row.belumTerverifikasi += a.jumlah;
    titik.get(a.userId)?.add(a.checkpointId);
  }

  for (const [id, row] of peta) {
    row.titikUnik = titik.get(id)?.size ?? 0;
    row.persenTitik = persen(row.titikUnik, totalTitikAktif);
  }

  return urutkan([...peta.values()]);
}

export type RingkasanLaporan = {
  personel: number;
  hadir: number;
  telat: number;
  tidakHadir: number;
  scan: number;
  tidakValid: number;
  /** Persen titik aktif yang dipindai minimal sekali oleh siapa pun dalam rentang. */
  persenTitikTerpatroli: number;
};

export function ringkasan(
  kehadiran: RekapKehadiranRow[],
  patroli: RekapPatroliRow[],
  agregat: AgregatPatroli[],
  totalTitikAktif: number,
): RingkasanLaporan {
  const titikSemua = new Set(agregat.map((a) => a.checkpointId));
  const jumlah = (rows: { [k: string]: unknown }[], k: string): number =>
    rows.reduce((s, r) => s + (r[k] as number), 0);

  return {
    personel: kehadiran.length,
    hadir: jumlah(kehadiran, "hadir"),
    telat: jumlah(kehadiran, "telat"),
    tidakHadir: jumlah(kehadiran, "tidakHadir"),
    scan: jumlah(patroli, "scan"),
    tidakValid: jumlah(patroli, "tidakValid"),
    persenTitikTerpatroli: persen(titikSemua.size, totalTitikAktif),
  };
}
