"use server";

import { randomUUID } from "node:crypto";

import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  isCloudinaryUploadAuthentic,
  signFotoUpload,
  type CloudinaryUploadAuthorization,
} from "@/lib/cloudinary";
import { parseCloudinaryFoto } from "@/lib/foto";
import { prisma } from "@/lib/prisma";
import { FIELD_ROLES } from "@/lib/roles";

/** Issues a per-user, one-asset Cloudinary signature after server role check. */
export async function authorizeFotoUpload(): Promise<CloudinaryUploadAuthorization> {
  const actor = await requireRole(FIELD_ROLES);
  const authorization = signFotoUpload(actor.id, randomUUID());

  await writeAudit({
    userId: actor.id,
    aksi: "FOTO_UPLOAD_DITANDATANGANI",
    tabel: "Foto",
    dataBaru: { publicId: authorization.publicId, mime: "image/jpeg" },
  });

  return authorization;
}

/** Verify Cloudinary's signed upload response and store only its metadata/key. */
export async function registerUploadedFoto(input: {
  publicId: string;
  version: string;
  signature: string;
  bytes: string;
  format: string;
}): Promise<string> {
  const actor = await requireRole(FIELD_ROLES);
  const parsed = parseCloudinaryFoto(input, actor.id);
  if (!parsed.ok) throw new Error(parsed.error);
  if (!isCloudinaryUploadAuthentic(parsed.value)) {
    throw new Error("Tanda tangan unggahan foto dari Cloudinary tidak valid.");
  }

  const foto = await prisma.foto.upsert({
    where: { key: parsed.value.publicId },
    create: {
      key: parsed.value.publicId,
      mime: parsed.value.mime,
      ukuran: parsed.value.bytes,
      userId: actor.id,
    },
    update: {},
    select: { key: true, userId: true, mime: true, ukuran: true },
  });
  if (foto.userId !== actor.id) {
    throw new Error("Foto tidak valid atau bukan milik Anda.");
  }

  await writeAudit({
    userId: actor.id,
    aksi: "FOTO_DIDAFTARKAN",
    tabel: "Foto",
    dataBaru: {
      key: foto.key,
      mime: foto.mime,
      ukuran: foto.ukuran,
    },
  });

  return foto.key;
}
