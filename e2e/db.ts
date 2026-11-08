import "dotenv/config";
import pg from "pg";

/** Hanya akun uji. Semua query dibatasi ke email ini; data non-uji tidak disentuh. */
export const EMAIL_UJI = [
  "uji.sec.a@uji.test",
  "uji.danru.a@uji.test",
  "uji.chief@uji.test",
] as const;

export async function denganDb<T>(fn: (db: pg.Client) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tidak di-set (dibutuhkan untuk setup/teardown E2E).");
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

/**
 * Hapus jejak E2E milik uji.sec.a: absensi, patroli, insiden, dan foto.
 * Dilakukan sebelum dan sesudah tes agar alur "absen masuk" bisa diulang.
 * Baris AuditLog sengaja dibiarkan (jejak audit tidak dihapus).
 */
export async function bersihkanJejakE2E(): Promise<void> {
  await denganDb(async (db) => {
    const { rows } = await db.query<{ id: string }>(
      `SELECT id FROM "User" WHERE email = $1 AND email LIKE 'uji.%@uji.test'`,
      ["uji.sec.a@uji.test"],
    );
    const id = rows[0]?.id;
    if (!id) return;
    await db.query(`DELETE FROM "Insiden" WHERE user_id = $1`, [id]);
    await db.query(`DELETE FROM "PatroliLog" WHERE user_id = $1`, [id]);
    await db.query(`DELETE FROM "Absensi" WHERE user_id = $1`, [id]);
    await db.query(`DELETE FROM "Foto" WHERE user_id = $1`, [id]);
  });
}

export async function hitungInsidenSecA(): Promise<number> {
  return denganDb(async (db) => {
    const { rows } = await db.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM "Insiden" i JOIN "User" u ON u.id = i.user_id WHERE u.email = 'uji.sec.a@uji.test'`,
    );
    return Number(rows[0]?.n ?? 0);
  });
}

/** Id absensi milik uji.sec.b (Regu B), untuk uji isolasi antar-regu. */
export async function idAbsensiSecB(): Promise<string | null> {
  return denganDb(async (db) => {
    const { rows } = await db.query<{ id: string }>(
      `SELECT a.id FROM "Absensi" a JOIN "User" u ON u.id = a.user_id WHERE u.email = 'uji.sec.b@uji.test' ORDER BY a.waktu_masuk DESC LIMIT 1`,
    );
    return rows[0]?.id ?? null;
  });
}

export async function statusDaruratSecA(): Promise<string[]> {
  return denganDb(async (db) => {
    const { rows } = await db.query<{ status: string }>(
      `SELECT i.status::text AS status FROM "Insiden" i JOIN "User" u ON u.id = i.user_id WHERE u.email = 'uji.sec.a@uji.test' AND i.prioritas::text = 'DARURAT'`,
    );
    return rows.map((r) => r.status);
  });
}
