import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

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
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const DATA_URL = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

async function uploadPhoto(dataUrl, publicId) {
  return cloudinary.uploader.upload(dataUrl, {
    public_id: publicId,
    type: "private",
    overwrite: true,
    resource_type: "image",
    format: "jpg",
    transformation: "c_limit,w_1280,h_1280,q_auto:good,f_jpg",
  });
}

async function migrateField({ table, rowId, userId, field, dataUrl }) {
  const match = DATA_URL.exec(dataUrl);
  if (!match) {
    console.warn(`Lewati ${table}.${rowId}.${field}: data URL tidak valid.`);
    return;
  }

  // Stable ID + overwrite makes retries safe if network/DB failed after upload.
  const publicId = `securepatrol/${userId}/legacy/${table}-${rowId}-${field}`;
  const uploaded = await uploadPhoto(dataUrl, publicId);

  await prisma.$transaction(async (tx) => {
    await tx.foto.upsert({
      where: { key: uploaded.public_id },
      create: {
        key: uploaded.public_id,
        mime: "image/jpeg",
        ukuran: uploaded.bytes,
        userId,
      },
      update: {
        mime: "image/jpeg",
        ukuran: uploaded.bytes,
        userId,
      },
    });

    if (table === "Absensi" && field === "fotoMasuk") {
      await tx.absensi.update({ where: { id: rowId }, data: { fotoMasuk: uploaded.public_id } });
    } else if (table === "Absensi" && field === "fotoKeluar") {
      await tx.absensi.update({ where: { id: rowId }, data: { fotoKeluar: uploaded.public_id } });
    } else if (table === "PatroliLog" && field === "foto") {
      await tx.patroliLog.update({ where: { id: rowId }, data: { foto: uploaded.public_id } });
    } else {
      throw new Error(`Kolom foto tidak dikenal: ${table}.${field}`);
    }

    await tx.auditLog.create({
      data: {
        userId,
        aksi: "MIGRASI_FOTO_CLOUDINARY",
        tabel: table,
        dataBaru: {
          id: rowId,
          kolom: field,
          key: uploaded.public_id,
          mime: "image/jpeg",
          ukuran: uploaded.bytes,
        },
      },
    });
  });

  console.log(`Migrasi ${table}.${rowId}.${field} -> ${uploaded.public_id}`);
}

async function run() {
  let migrated = 0;
  const absensi = await prisma.absensi.findMany({
    where: {
      OR: [
        { fotoMasuk: { startsWith: "data:image/" } },
        { fotoKeluar: { startsWith: "data:image/" } },
      ],
    },
    select: { id: true, userId: true, fotoMasuk: true, fotoKeluar: true },
    orderBy: { id: "asc" },
  });

  for (const row of absensi) {
    for (const [field, dataUrl] of [
      ["fotoMasuk", row.fotoMasuk],
      ["fotoKeluar", row.fotoKeluar],
    ]) {
      if (dataUrl && DATA_URL.test(dataUrl)) {
        await migrateField({ table: "Absensi", rowId: row.id, userId: row.userId, field, dataUrl });
        migrated += 1;
      }
    }
  }

  const patroli = await prisma.patroliLog.findMany({
    where: { foto: { startsWith: "data:image/" } },
    select: { id: true, userId: true, foto: true },
    orderBy: { id: "asc" },
  });
  for (const row of patroli) {
    if (row.foto && DATA_URL.test(row.foto)) {
      await migrateField({
        table: "PatroliLog",
        rowId: row.id,
        userId: row.userId,
        field: "foto",
        dataUrl: row.foto,
      });
      migrated += 1;
    }
  }

  console.log(`Selesai: ${migrated} foto dipindahkan.`);
}

try {
  await run();
} catch (error) {
  console.error("Migrasi foto gagal; aman dijalankan ulang:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
