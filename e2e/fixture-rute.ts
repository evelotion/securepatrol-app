import { denganDb } from "./db";

/**
 * Fixture anti titik palsu: rute UJI-001 -> UJI-002 -> UJI-003 dan jadwal hari
 * ini untuk uji.sec.a. Semua baris dibuat khusus E2E dan dihapus oleh
 * `bersihkanRuteE2E`; data non-uji tidak disentuh.
 */

const NAMA_RUTE_E2E = "E2E Anti Titik Palsu";
const TITIK_E2E = [
  { kode: "UJI-002", nama: "Uji Titik 2" },
  { kode: "UJI-003", nama: "Uji Titik 3" },
] as const;

function hariWib(): string {
  return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
}

/** Hanya titik UJI-002 (tanpa rute/jadwal) untuk uji fallback jeda global. */
export async function siapkanTitikTanpaRuteE2E(): Promise<void> {
  await bersihkanRuteE2E();
  await denganDb(async (db) => {
    await db.query(
      `INSERT INTO "Checkpoint" (id, nama_titik, kode_barcode, aktif, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, true, now(), now())
       ON CONFLICT (kode_barcode) DO NOTHING`,
      [TITIK_E2E[0].nama, TITIK_E2E[0].kode],
    );
  });
}

/** UJI-002 memakai batas bawaan 60 dtk, UJI-003 batas 0 (dimatikan admin). */
export async function siapkanRuteE2E(): Promise<void> {
  await bersihkanRuteE2E();
  await denganDb(async (db) => {
    for (const t of TITIK_E2E) {
      await db.query(
        `INSERT INTO "Checkpoint" (id, nama_titik, kode_barcode, aktif, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, true, now(), now())
         ON CONFLICT (kode_barcode) DO NOTHING`,
        [t.nama, t.kode],
      );
    }

    const shift = await db.query<{ id: string }>(
      `SELECT id FROM "Shift" WHERE nama = 'Uji Harian' AND aktif`,
    );
    const shiftId = shift.rows[0]?.id;
    if (!shiftId) {
      throw new Error('Shift "Uji Harian" tidak ada (jalankan seed uji).');
    }

    const rute = await db.query<{ id: string }>(
      `INSERT INTO "Rute" (id, nama, shift_id, target_putaran, interval_menit, aktif, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, 12, 120, true, now(), now())
       RETURNING id`,
      [NAMA_RUTE_E2E, shiftId],
    );
    const ruteId = rute.rows[0].id;

    const urutan = [
      { kode: "UJI-001", min: 60 },
      { kode: "UJI-002", min: 60 },
      { kode: "UJI-003", min: 0 },
    ];
    for (const [i, t] of urutan.entries()) {
      await db.query(
        `INSERT INTO "RuteTitik" (id, rute_id, checkpoint_id, urutan, min_detik_dari_sebelumnya)
         SELECT gen_random_uuid()::text, $1, c.id, $2, $3
         FROM "Checkpoint" c WHERE c.kode_barcode = $4`,
        [ruteId, i + 1, t.min, t.kode],
      );
    }

    await db.query(
      `INSERT INTO "Jadwal" (id, user_id, shift_id, tanggal, aktif, created_at)
       SELECT gen_random_uuid()::text, u.id, $1, $2::date, true, now()
       FROM "User" u WHERE u.email = 'uji.sec.a@uji.test'
       ON CONFLICT (user_id, tanggal) DO NOTHING`,
      [shiftId, hariWib()],
    );
  });
}

/** Hapus rute E2E, titik UJI-002/003 (log ikut terhapus), dan jadwal uji.sec.a hari ini. */
export async function bersihkanRuteE2E(): Promise<void> {
  await denganDb(async (db) => {
    await db.query(`DELETE FROM "Rute" WHERE nama = $1`, [NAMA_RUTE_E2E]);
    await db.query(
      `DELETE FROM "Checkpoint" WHERE kode_barcode = ANY($1::text[])`,
      [TITIK_E2E.map((t) => t.kode)],
    );
    await db.query(
      `DELETE FROM "Jadwal"
       WHERE tanggal = $1::date
         AND user_id IN (SELECT id FROM "User" WHERE email = 'uji.sec.a@uji.test')`,
      [hariWib()],
    );
  });
}

export type LogPatroliE2E = {
  namaTitik: string;
  status: string;
  alasan: string | null;
};

/** Log patroli uji.sec.a, terlama dulu. */
export async function logPatroliSecA(): Promise<LogPatroliE2E[]> {
  return denganDb(async (db) => {
    const { rows } = await db.query<{
      nama_titik: string;
      status: string;
      alasan: string | null;
    }>(
      `SELECT c.nama_titik, p.status::text AS status, p.alasan
       FROM "PatroliLog" p
       JOIN "Checkpoint" c ON c.id = p.checkpoint_id
       JOIN "User" u ON u.id = p.user_id
       WHERE u.email = 'uji.sec.a@uji.test'
       ORDER BY p.waktu ASC`,
    );
    return rows.map((r) => ({
      namaTitik: r.nama_titik,
      status: r.status,
      alasan: r.alasan,
    }));
  });
}
