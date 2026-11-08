import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Penjaga regresi anti titik palsu: foto bukti hanya dari kamera langsung
 * (getUserMedia -> canvas) dan selalu diberi watermark. Ini pemeriksaan
 * statis atas kode sumber, jadi input galeri tidak bisa masuk tanpa sengaja.
 */

function berkasTsx(dir: string): string[] {
  const hasil: string[] = [];
  for (const nama of readdirSync(dir)) {
    const jalur = join(dir, nama);
    if (statSync(jalur).isDirectory()) hasil.push(...berkasTsx(jalur));
    else if (jalur.endsWith(".tsx")) hasil.push(jalur);
  }
  return hasil;
}

const SEMUA = [...berkasTsx("app"), ...berkasTsx("components")].map((jalur) => ({
  jalur,
  isi: readFileSync(jalur, "utf8"),
}));

describe("foto bukti hanya dari kamera", () => {
  it("tidak ada input file / pemilih berkas di UI", () => {
    const pelanggar = SEMUA.filter(({ isi }) =>
      /type=["']file["']|showOpenFilePicker|accept=["'][^"']*image/.test(isi),
    ).map((f) => f.jalur);
    expect(pelanggar).toEqual([]);
  });

  it("foto diambil dari getUserMedia dan digambar ke canvas", () => {
    const kamera = readFileSync("components/camera-capture.tsx", "utf8");
    expect(kamera).toContain("getUserMedia");
    expect(kamera).toContain("drawImage(video");
  });

  it("setiap <CameraCapture> menyetel watermark", () => {
    const tanpa: string[] = [];
    for (const { jalur, isi } of SEMUA) {
      for (const m of isi.matchAll(/<CameraCapture\b[\s\S]*?\/>/g)) {
        if (!/\bwatermark=/.test(m[0])) tanpa.push(jalur);
      }
    }
    expect(tanpa).toEqual([]);
  });

  it("prop watermark wajib (bukan opsional) dan ditulis ke piksel foto", () => {
    const kamera = readFileSync("components/camera-capture.tsx", "utf8");
    expect(kamera).toMatch(/\bwatermark: string;/);
    expect(kamera).toContain("context.fillText(line");
  });

  it("ada komponen yang memakai CameraCapture (uji tidak kosong)", () => {
    const pemakai = SEMUA.filter(({ isi }) => isi.includes("<CameraCapture"));
    expect(pemakai.length).toBeGreaterThanOrEqual(3);
  });
});
