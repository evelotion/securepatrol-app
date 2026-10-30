/**
 * Migrasi satu kali: pindahkan foto base64 lama (Absensi, PatroliLog) ke
 * Cloudinary private, lalu ganti kolomnya dengan public ID.
 * Jalankan: npm run photos:migrate-cloudinary
 *
 * Sengaja memakai `pg` langsung (bukan Prisma Client) karena client Prisma v7
 * yang di-generate berupa TypeScript dan tidak bisa diimpor `node` tanpa
 * transpiler — sama seperti prisma/seed.mjs.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { Client } from "pg";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const databaseUrl = process.env.DATABASE_URL;

if (!cloudName || !apiKey || !apiSecret || !databaseUrl) {
  console.error(
    "Wajib mengisi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, dan DATABASE_URL.",
  );
  process.exit(1);
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
const client = new Client({ connectionString: databaseUrl });

const DATA_URL = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

const COLUMNS = {
  "Absensi.fotoMasuk": { table: "Absensi", column: "foto_masuk" },
  "Absensi.fotoKeluar": { table: "Absensi", column: "foto_keluar" },
  "PatroliLog.foto": { table: "PatroliLog", column: "foto" },
};

async function uploadPhoto(dataUrl, publicId) {
  return cloudinary.uploader.upload(dataUrl, {
    public_id: publicId,
    type: "private",
    overwrite: true,
    resource_type: "image",
    format: "jpg",
  });
}

async function migrateField({ label, rowId, userId, dataUrl }) {
  const target = COLUMNS[label];
  if (!target) throw new Error(`Kolom foto tidak dikenal: ${label}`);

  const match = DATA_URL.exec(dataUrl);
  if (!match) {
    console.warn(`Lewati ${label}.${rowId}: data URL tidak valid.`);
    return false;
  }

  // ID stabil + overwrite membuat ulang aman bila jaringan/DB gagal setelah upload.
  const publicId = `securepatrol/${userId}/legacy/${label.replace(".", "-")}-${rowId}`;
  const uploaded = await uploadPhoto(dataUrl, publicId);

  await client.query("BEGIN");
  try {
    await client.query(
      `INSERT INTO "Foto" ("id","key","mime","ukuran","user_id")
       VALUES ($1,$2,'image/jpeg',$3,$4)
       ON CONFLICT ("key") DO UPDATE SET "mime" = EXCLUDED."mime", "ukuran" = EXCLUDED."ukuran", "user_id" = EXCLUDED."user_id"`,
      [randomUUID(), uploaded.public_id, uploaded.bytes, userId],
    );

    await client.query(`UPDATE "${target.table}" SET "${target.column}" = $1 WHERE "id" = $2`, [
      uploaded.public_id,
      rowId,
    ]);

    await client.query(
      `INSERT INTO "AuditLog" ("id","user_id","aksi","tabel","data_baru")
       VALUES ($1,$2,'MIGRASI_FOTO_CLOUDINARY',$3,$4)`,
      [
        randomUUID(),
        userId,
        target.table,
        JSON.stringify({
          id: rowId,
          kolom: target.column,
          key: uploaded.public_id,
          mime: "image/jpeg",
          ukuran: uploaded.bytes,
        }),
      ],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  console.log(`Migrasi ${label}.${rowId} -> ${uploaded.public_id}`);
  return true;
}

async function run() {
  let migrated = 0;

  const absensi = await client.query(
    `SELECT "id","user_id","foto_masuk","foto_keluar" FROM "Absensi"
     WHERE "foto_masuk" LIKE 'data:image/%' OR "foto_keluar" LIKE 'data:image/%'
     ORDER BY "id"`,
  );

  for (const row of absensi.rows) {
    for (const [label, dataUrl] of [
      ["Absensi.fotoMasuk", row.foto_masuk],
      ["Absensi.fotoKeluar", row.foto_keluar],
    ]) {
      if (dataUrl && DATA_URL.test(dataUrl)) {
        if (await migrateField({ label, rowId: row.id, userId: row.user_id, dataUrl })) {
          migrated += 1;
        }
      }
    }
  }

  const patroli = await client.query(
    `SELECT "id","user_id","foto" FROM "PatroliLog" WHERE "foto" LIKE 'data:image/%' ORDER BY "id"`,
  );

  for (const row of patroli.rows) {
    if (row.foto && DATA_URL.test(row.foto)) {
      const ok = await migrateField({
        label: "PatroliLog.foto",
        rowId: row.id,
        userId: row.user_id,
        dataUrl: row.foto,
      });
      if (ok) migrated += 1;
    }
  }

  console.log(`Selesai: ${migrated} foto dipindahkan.`);
}

await client.connect();
try {
  await run();
} catch (error) {
  console.error("Migrasi foto gagal; aman dijalankan ulang:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
