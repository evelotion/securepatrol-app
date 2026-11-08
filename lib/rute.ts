/**
 * Progres rute patroli per putaran (F4-3) — murni, tanpa DB.
 *
 * Satu shift dibagi menjadi `targetPutaran` jendela waktu berdurasi
 * `intervalMenit`. Titik dianggap dikunjungi bila ada log di dalam jendela
 * putaran tersebut; titik yang jendelanya sudah lewat tanpa log ditandai
 * TERLEWAT.
 */

import { jendelaShift, type ShiftJam } from "./shift";

export type TitikRute = {
  checkpointId: string;
  namaTitik: string;
  urutan: number;
};

export type LogRute = {
  checkpointId: string;
  waktu: Date;
};

export type StatusPutaran = "BELUM" | "BERJALAN" | "SELESAI";
export type StatusTitikPutaran = "DIKUNJUNGI" | "TERLEWAT" | "BELUM";

export type TitikPutaran = TitikRute & {
  status: StatusTitikPutaran;
  waktu: Date | null;
};

export type PutaranProgress = {
  putaran: number;
  mulai: Date;
  selesai: Date;
  status: StatusPutaran;
  total: number;
  dikunjungi: number;
  terlewat: number;
  titik: TitikPutaran[];
};

export function hitungPutaran(input: {
  rute: { targetPutaran: number; intervalMenit: number };
  shift: ShiftJam;
  tanggal: string;
  titik: TitikRute[];
  logs: LogRute[];
  sekarang: Date;
}): PutaranProgress[] {
  const jendela = jendelaShift(input.tanggal, input.shift);
  if (!jendela) return [];

  const target = Math.max(1, Math.floor(input.rute.targetPutaran));
  const intervalMs = Math.max(1, Math.floor(input.rute.intervalMenit)) * 60_000;
  const titikUrut = [...input.titik].sort((a, b) => a.urutan - b.urutan);

  const hasil: PutaranProgress[] = [];

  for (let i = 0; i < target; i += 1) {
    const mulaiMs = jendela.mulai.getTime() + i * intervalMs;
    if (mulaiMs >= jendela.selesai.getTime()) break;

    const selesaiMs = Math.min(mulaiMs + intervalMs, jendela.selesai.getTime());
    const mulai = new Date(mulaiMs);
    const selesai = new Date(selesaiMs);
    const status: StatusPutaran =
      input.sekarang.getTime() < mulaiMs
        ? "BELUM"
        : input.sekarang.getTime() >= selesaiMs
          ? "SELESAI"
          : "BERJALAN";

    const titik: TitikPutaran[] = titikUrut.map((t) => {
      const log =
        input.logs
          .filter(
            (l) =>
              l.checkpointId === t.checkpointId &&
              l.waktu.getTime() >= mulaiMs &&
              l.waktu.getTime() < selesaiMs,
          )
          .sort((a, b) => a.waktu.getTime() - b.waktu.getTime())[0] ?? null;

      const statusTitik: StatusTitikPutaran = log
        ? "DIKUNJUNGI"
        : input.sekarang.getTime() >= selesaiMs
          ? "TERLEWAT"
          : "BELUM";

      return { ...t, status: statusTitik, waktu: log?.waktu ?? null };
    });

    hasil.push({
      putaran: i + 1,
      mulai,
      selesai,
      status,
      total: titik.length,
      dikunjungi: titik.filter((t) => t.status === "DIKUNJUNGI").length,
      terlewat: titik.filter((t) => t.status === "TERLEWAT").length,
      titik,
    });
  }

  return hasil;
}

/** Semua checkpoint yang terlewat di minimal satu putaran yang sudah lewat. */
export function checkpointTerlewat(putaran: PutaranProgress[]): Set<string> {
  const hasil = new Set<string>();
  for (const p of putaran) {
    for (const t of p.titik) {
      if (t.status === "TERLEWAT") hasil.add(t.checkpointId);
    }
  }
  return hasil;
}

/**
 * Putaran yang sedang berjalan pada `sekarang` (jendela waktunya), atau null
 * bila tidak ada (di luar shift, atau di celah setelah putaran terakhir).
 * Dipakai anti titik palsu: "putaran yang sama" = jendela ini.
 */
export function putaranBerjalan(input: {
  rute: { targetPutaran: number; intervalMenit: number };
  shift: ShiftJam;
  tanggal: string;
  sekarang: Date;
}): { putaran: number; mulai: Date; selesai: Date } | null {
  const jendela = hitungPutaran({ ...input, titik: [], logs: [] });
  const p = jendela.find((w) => w.status === "BERJALAN");
  return p ? { putaran: p.putaran, mulai: p.mulai, selesai: p.selesai } : null;
}
