import { describe, expect, it } from "vitest";

import {
  MAX_FOTO_BYTES,
  isLegacyFoto,
  parseCloudinaryFoto,
} from "./foto";

const USER_ID = "u-1";
const VALID = {
  publicId: `securepatrol/${USER_ID}/123e4567-e89b-12d3-a456-426614174000`,
  version: "1234567890",
  signature: "a".repeat(40),
  bytes: "1024",
  format: "jpg",
};

describe("parseCloudinaryFoto", () => {
  it("accepts a signed JPEG receipt under the current user's folder", () => {
    expect(parseCloudinaryFoto(VALID, USER_ID)).toMatchObject({
      ok: true,
      value: {
        publicId: VALID.publicId,
        version: 1234567890,
        bytes: 1024,
        mime: "image/jpeg",
      },
    });
  });

  it("rejects an asset outside the authenticated user's folder", () => {
    expect(
      parseCloudinaryFoto(
        { ...VALID, publicId: VALID.publicId.replace(USER_ID, "u-2") },
        USER_ID,
      ),
    ).toMatchObject({ ok: false });
  });

  it("rejects malformed public IDs, signatures, versions and sizes", () => {
    expect(parseCloudinaryFoto({ ...VALID, publicId: "other/asset" }, USER_ID).ok).toBe(false);
    expect(parseCloudinaryFoto({ ...VALID, signature: "bad" }, USER_ID).ok).toBe(false);
    expect(parseCloudinaryFoto({ ...VALID, version: "0" }, USER_ID).ok).toBe(false);
    expect(parseCloudinaryFoto({ ...VALID, bytes: "0" }, USER_ID).ok).toBe(false);
    expect(
      parseCloudinaryFoto({ ...VALID, bytes: String(MAX_FOTO_BYTES + 1) }, USER_ID).ok,
    ).toBe(false);
  });

  it("accepts the size limit and rejects non-JPEG uploads", () => {
    expect(
      parseCloudinaryFoto({ ...VALID, bytes: String(MAX_FOTO_BYTES) }, USER_ID).ok,
    ).toBe(true);
    expect(parseCloudinaryFoto({ ...VALID, format: "png" }, USER_ID).ok).toBe(false);
  });
});

describe("isLegacyFoto", () => {
  it("detects supported old base64 data URLs", () => {
    expect(isLegacyFoto("data:image/jpeg;base64,abc")).toBe(true);
    expect(isLegacyFoto("data:image/webp;base64,abc")).toBe(true);
  });

  it("does not confuse Cloudinary keys or null with legacy photos", () => {
    expect(isLegacyFoto("securepatrol/u-1/image-id")).toBe(false);
    expect(isLegacyFoto(null)).toBe(false);
  });
});
