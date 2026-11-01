import "server-only";

import { timingSafeEqual } from "node:crypto";

import { v2 as cloudinary } from "cloudinary";

import type { CloudinaryFoto } from "@/lib/foto";

const FOTO_FOLDER = "securepatrol";
const FOTO_URL_TTL_SECONDS = 10 * 60;

type CloudinarySettings = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

function getCloudinarySettings(): CloudinarySettings {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary belum dikonfigurasi. Isi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET.",
    );
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return { cloudName, apiKey, apiSecret };
}

export type CloudinaryUploadAuthorization = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  publicId: string;
  signature: string;
};

/** Creates a per-user signed upload for one private JPEG asset. */
export function signFotoUpload(
  userId: string,
  assetId: string,
): CloudinaryUploadAuthorization {
  const settings = getCloudinarySettings();
  const timestamp = Math.floor(Date.now() / 1000);
  // public_id sudah memuat folder; mengirim `folder` terpisah membuat
  // Cloudinary menempelkannya lagi (securepatrol/<uid>/securepatrol/<uid>/…).
  const publicId = `${FOTO_FOLDER}/${userId}/${assetId}`;
  // Foto sudah dikompres ke JPEG 1280 px di client; incoming transformation
  // tidak dipakai karena Cloudinary membaca nilai string-nya sebagai nama
  // transformation dan menolak upload.
  const params = {
    timestamp,
    public_id: publicId,
    type: "private",
  };
  const signature = cloudinary.utils.api_sign_request(params, settings.apiSecret);

  return {
    cloudName: settings.cloudName,
    apiKey: settings.apiKey,
    timestamp,
    publicId,
    signature,
  };
}

/** Verifies the upload response signature before accepting its storage key. */
export function isCloudinaryUploadAuthentic(foto: CloudinaryFoto): boolean {
  const { apiSecret } = getCloudinarySettings();
  const expected = cloudinary.utils.api_sign_request(
    { public_id: foto.publicId, version: foto.version },
    apiSecret,
  );
  const expectedBytes = Buffer.from(expected, "hex");
  const receivedBytes = Buffer.from(foto.signature, "hex");
  return (
    expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}

/** Returns a private download URL that expires ten minutes after generation. */
export function getPrivateFotoUrl(publicId: string, now = Date.now()): string {
  getCloudinarySettings();
  return cloudinary.utils.private_download_url(publicId, "jpg", {
    resource_type: "image",
    type: "private",
    expires_at: Math.floor(now / 1000) + FOTO_URL_TTL_SECONDS,
  });
}

export function isCloudinaryKeyForUser(key: string, userId: string): boolean {
  return key.startsWith(`${FOTO_FOLDER}/${userId}/`);
}
