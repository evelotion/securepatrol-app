/**
 * Seed awal SecurePatrol — membuat akun SUPER_ADMIN bila belum ada.
 * Jalankan: npx prisma db seed
 *
 * Sengaja memakai `pg` langsung agar tidak butuh transpiler TypeScript.
 */
import "dotenv/config";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { Client } from "pg";

const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@securepatrol.id";
const NAMA = process.env.SEED_ADMIN_NAMA ?? "Administrator";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const existing = await client.query(`SELECT "id" FROM "User" WHERE "email" = $1`, [EMAIL]);

  if (existing.rows.length > 0) {
    console.log(`Super admin ${EMAIL} sudah ada — tidak ada yang diubah.`);
  } else {
    const now = new Date();
    await client.query(
      `INSERT INTO "User" ("id","nama","email","username","password","role","regu","aktif","created_at","updated_at")
       VALUES ($1,$2,$3,$4,$5,'SUPER_ADMIN',NULL,true,$6,$6)`,
      [randomUUID(), NAMA, EMAIL, "admin", hashPassword(PASSWORD), now],
    );
    console.log(`Super admin dibuat: ${EMAIL}`);
  }

  const { rows } = await client.query(
    `SELECT (SELECT COUNT(*)::int FROM "User") AS users, (SELECT COUNT(*)::int FROM "Checkpoint") AS checkpoints`,
  );
  console.log("Ringkasan:", rows[0]);
} finally {
  await client.end();
}
