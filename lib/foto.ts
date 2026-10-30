export const MAX_FOTO_BYTES = 5 * 1024 * 1024;

export type CloudinaryFoto = {
  publicId: string;
  version: number;
  signature: string;
  bytes: number;
  mime: "image/jpeg";
};

export type ParseFotoResult =
  | { ok: true; value: CloudinaryFoto }
  | { ok: false; error: string };

/** Validates the browser's upload receipt before a storage key is persisted. */
export function parseCloudinaryFoto(
  input: {
    publicId: string;
    version: string;
    signature: string;
    bytes: string;
    format: string;
  },
  userId: string,
): ParseFotoResult {
  const expectedPrefix = `securepatrol/${userId}/`;
  const suffix = input.publicId.startsWith(expectedPrefix)
    ? input.publicId.slice(expectedPrefix.length)
    : "";
  const version = Number(input.version);
  const bytes = Number(input.bytes);

  if (!/^[0-9a-f-]{36}$/i.test(suffix)) {
    return { ok: false, error: "Unggahan foto tidak valid atau bukan milik Anda." };
  }
  if (!Number.isSafeInteger(version) || version <= 0) {
    return { ok: false, error: "Versi unggahan foto tidak valid." };
  }
  if (!/^[0-9a-f]{40}$/i.test(input.signature)) {
    return { ok: false, error: "Tanda tangan unggahan foto tidak valid." };
  }
  if (
    !Number.isSafeInteger(bytes) ||
    bytes <= 0 ||
    bytes > MAX_FOTO_BYTES
  ) {
    return { ok: false, error: "Ukuran foto tidak valid atau melebihi 5 MB." };
  }
  if (input.format !== "jpg") {
    return { ok: false, error: "Foto harus berformat JPEG." };
  }

  return {
    ok: true,
    value: {
      publicId: input.publicId,
      version,
      signature: input.signature,
      bytes,
      mime: "image/jpeg",
    },
  };
}

/** Existing base64 values remain readable until the one-time migration runs. */
export function isLegacyFoto(value: string | null): value is string {
  return value !== null && /^data:image\/(jpeg|jpg|png|webp);base64,/.test(value);
}
