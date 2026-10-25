/**
 * Generate ikon PWA sederhana (PNG) tanpa dependency eksternal.
 * Jalankan: node scripts/gen-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const i0 = 0x4f, i1 = 0x46, i2 = 0xe5; // indigo-600 #4f46e5
  const s0 = 0x0e, s1 = 0xa5, s2 = 0xe9; // sky-500 #0ea5e9
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.2;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (size * 2);
      let rC = Math.round(i0 + (s0 - i0) * t);
      let gC = Math.round(i1 + (s1 - i1) * t);
      let bC = Math.round(i2 + (s2 - i2) * t);

      // Lingkaran putih sebagai mark.
      const d = Math.hypot(x - cx, y - cy);
      if (d < r) {
        rC = 255;
        gC = 255;
        bC = 255;
      } else if (d < r + size * 0.03) {
        rC = Math.round(255 + (rC - 255) * ((d - r) / (size * 0.03)));
        gC = Math.round(255 + (gC - 255) * ((d - r) / (size * 0.03)));
        bC = Math.round(255 + (bC - 255) * ((d - r) / (size * 0.03)));
      }

      const o = rowStart + 1 + x * 4;
      raw[o] = rC;
      raw[o + 1] = gC;
      raw[o + 2] = bC;
      raw[o + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", png(192));
writeFileSync("public/icons/icon-512.png", png(512));
console.log("icons written");
