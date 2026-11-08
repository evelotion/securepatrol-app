import { describe, expect, it } from "vitest";

import {
  PATROL_MAX_ACCURACY_M,
  PATROL_MAX_SPEED_MPS,
  PATROL_MIN_INTERVAL_MS,
  ALASAN_TERLALU_CEPAT,
  MIN_DETIK_BAWAAN,
  PATROL_MIN_JEDA_DETIK,
  PATROL_RADIUS_M,
  parseRadius,
  terlaluCepat,
  validasiScan,
  type ValidasiScanInput,
} from "./geo";

const BASE: ValidasiScanInput = {
  checkpointId: "cp-1",
  sekarang: new Date("2026-10-27T10:00:00.000Z"),
  posisiHP: { lat: -6.2, long: 106.8 },
  akurasiM: 10,
  posisiCheckpoint: { lat: -6.2, long: 106.8 },
  scanSebelumnya: null,
  scanCheckpointSebelumnya: null,
  sedangBertugas: true,
};

function evaluasi(override: Partial<ValidasiScanInput> = {}) {
  return validasiScan({ ...BASE, ...override });
}

describe("validasiScan — tujuh aturan spec Fase 2", () => {
  it("1. checkpoint tanpa koordinat -> BELUM_TERVERIFIKASI, tidak ditolak", () => {
    const result = evaluasi({ posisiCheckpoint: null, posisiHP: null });
    expect(result).toMatchObject({
      ditolak: false,
      status: "BELUM_TERVERIFIKASI",
      alasan: "titik belum dipetakan",
      jarakM: null,
    });
  });

  it("7. tanpa absensi terbuka ditolak bahkan untuk checkpoint tanpa koordinat", () => {
    expect(
      evaluasi({ posisiCheckpoint: null, sedangBertugas: false }),
    ).toMatchObject({ ditolak: true });
  });

  it("1. checkpoint tanpa koordinat menang atas aturan lokasi lain (urutan pertama)", () => {
    const result = evaluasi({
      posisiCheckpoint: null,
      posisiHP: null,
      akurasiM: 500,
      sedangBertugas: true,
    });
    expect(result.status).toBe("BELUM_TERVERIFIKASI");
    expect(result.alasan).toBe("titik belum dipetakan");
  });

  it("2. lokasi HP tidak dikirim -> TIDAK_VALID", () => {
    expect(evaluasi({ posisiHP: null })).toMatchObject({
      ditolak: false,
      status: "TIDAK_VALID",
      alasan: "lokasi GPS tidak tersedia",
    });
  });

  it("3. akurasi lebih dari PATROL_MAX_ACCURACY_M -> GPS buruk", () => {
    expect(evaluasi({ akurasiM: PATROL_MAX_ACCURACY_M + 0.01 })).toMatchObject({
      status: "TIDAK_VALID",
      alasan: "akurasi GPS buruk",
    });
  });

  it("3. akurasi tepat pada ambang masih boleh dinilai lanjut", () => {
    expect(evaluasi({ akurasiM: PATROL_MAX_ACCURACY_M }).status).toBe("VALID");
  });

  it("3. accuracy yang tidak dikirim/null -> GPS buruk", () => {
    expect(evaluasi({ akurasiM: null })).toMatchObject({
      status: "TIDAK_VALID",
      alasan: "akurasi GPS buruk",
    });
  });

  it("4. jarak di luar PATROL_RADIUS_M -> TIDAK_VALID", () => {
    // Satu derajat lintang sekitar 111 km, jauh di luar radius default.
    expect(
      evaluasi({ posisiHP: { lat: -6.19, long: 106.8 } }),
    ).toMatchObject({
      status: "TIDAK_VALID",
      alasan: "di luar radius",
    });
  });

  it("5. scan checkpoint sama sebelum 10 menit ditolak tanpa menyimpan log", () => {
    const result = evaluasi({
      scanCheckpointSebelumnya: new Date(
        BASE.sekarang.getTime() - PATROL_MIN_INTERVAL_MS + 1,
      ),
    });
    expect(result).toMatchObject({
      ditolak: true,
      pesanTolak: "Titik ini baru saja dipindai",
    });
  });

  it("5. tepat 10 menit sejak scan checkpoint yang sama diperbolehkan", () => {
    expect(
      evaluasi({
        scanCheckpointSebelumnya: new Date(
          BASE.sekarang.getTime() - PATROL_MIN_INTERVAL_MS,
        ),
      }).status,
    ).toBe("VALID");
  });

  it("5. scan checkpoint berbeda tidak ditolak oleh cooldown checkpoint", () => {
    // Pemanggil memberikan waktu scan sebelumnya hanya untuk checkpoint sama;
    // null berarti tidak ada scan terdahulu checkpoint ini.
    expect(evaluasi({ scanCheckpointSebelumnya: null }).status).toBe("VALID");
  });

  it("6. kecepatan di atas 3 m/s -> perpindahan tidak wajar", () => {
    // Bergerak ~111 m dalam 10 detik = ~11 m/s, sementara kedua scan dalam radius.
    const result = evaluasi({
      posisiHP: { lat: -6.2, long: 106.8005 },
      scanSebelumnya: {
        waktu: new Date(BASE.sekarang.getTime() - 10_000),
        posisi: { lat: -6.2, long: 106.7995 },
      },
    });
    expect(result).toMatchObject({
      status: "TIDAK_VALID",
      alasan: "perpindahan tidak wajar",
    });
  });

  it("6. kecepatan tepat 3 m/s tidak ditandai perpindahan tidak wajar", () => {
    const deltaLon = (PATROL_MAX_SPEED_MPS * 10) / 111_000;
    const result = evaluasi({
      posisiHP: { lat: -6.2, long: 106.8 + deltaLon },
      scanSebelumnya: {
        waktu: new Date(BASE.sekarang.getTime() - 10_000),
        posisi: { lat: -6.2, long: 106.8 },
      },
    });
    expect(result.alasan).not.toBe("perpindahan tidak wajar");
  });

  it("7. tanpa absensi terbuka -> scan ditolak", () => {
    expect(evaluasi({ sedangBertugas: false })).toMatchObject({
      ditolak: true,
      pesanTolak: "Patroli hanya bisa dilakukan saat sedang bertugas",
    });
  });

  it("urutan: di luar radius lebih dahulu daripada cooldown/kecepatan", () => {
    const result = evaluasi({
      posisiHP: { lat: -6.19, long: 106.8 },
      scanCheckpointSebelumnya: new Date(BASE.sekarang.getTime() - 1000),
      scanSebelumnya: {
        waktu: new Date(BASE.sekarang.getTime() - 1000),
        posisi: { lat: -6.2, long: 106.8 },
      },
      sedangBertugas: true,
    });
    expect(result.alasan).toBe("di luar radius");
    expect(result.ditolak).toBe(false);
  });

  it("hasil VALID menyertakan jarak dan akurasi integer", () => {
    expect(evaluasi({ akurasiM: 9.7 })).toMatchObject({
      ditolak: false,
      status: "VALID",
      alasan: null,
      jarakM: 0,
      akurasiM: 10,
    });
  });

  it("ambang env mempunyai nilai default spec", () => {
    expect(PATROL_MAX_ACCURACY_M).toBeGreaterThan(0);
    expect(PATROL_RADIUS_M).toBeGreaterThan(0);
    expect(PATROL_MAX_SPEED_MPS).toBe(3);
  });
});

describe("radius per titik", () => {
  // ~0,0009 derajat lintang = ~100 m.
  const JAUH_150M = { lat: -6.2 + 0.00135, long: 106.8 };

  it("radius titik lebih besar dari bawaan menerima scan yang sebelumnya di luar radius", () => {
    expect(evaluasi({ posisiHP: JAUH_150M }).alasan).toBe("di luar radius");
    expect(evaluasi({ posisiHP: JAUH_150M, radiusM: 200 }).status).toBe("VALID");
  });

  it("radius titik lebih kecil dari bawaan menolak scan yang sebelumnya valid", () => {
    const dekat = { lat: -6.2 + 0.00045, long: 106.8 }; // ~50 m
    expect(evaluasi({ posisiHP: dekat }).status).toBe("VALID");
    expect(evaluasi({ posisiHP: dekat, radiusM: 30 })).toMatchObject({
      status: "TIDAK_VALID",
      alasan: "di luar radius",
    });
  });
});

describe("terlaluCepat — waktu tempuh minimum antar titik", () => {
  const SEKARANG = new Date("2026-10-27T10:00:00.000Z");
  const lalu = (detik: number) => new Date(SEKARANG.getTime() - detik * 1000);

  it("lebih cepat dari batas -> true; tepat di batas atau lebih lambat -> false", () => {
    expect(terlaluCepat(SEKARANG, { minDetik: 60, scanSebelumnyaDiPutaran: lalu(59) })).toBe(true);
    expect(terlaluCepat(SEKARANG, { minDetik: 60, scanSebelumnyaDiPutaran: lalu(60) })).toBe(false);
    expect(terlaluCepat(SEKARANG, { minDetik: 60, scanSebelumnyaDiPutaran: lalu(300) })).toBe(false);
  });

  it("tanpa scan sebelumnya, tanpa konteks rute, atau batas 0 -> tidak berlaku", () => {
    expect(terlaluCepat(SEKARANG, { minDetik: 60, scanSebelumnyaDiPutaran: null })).toBe(false);
    expect(terlaluCepat(SEKARANG, null)).toBe(false);
    expect(terlaluCepat(SEKARANG, undefined)).toBe(false);
    expect(terlaluCepat(SEKARANG, { minDetik: 0, scanSebelumnyaDiPutaran: lalu(1) })).toBe(false);
  });

  it("nilai bawaan 60 detik", () => {
    expect(MIN_DETIK_BAWAAN).toBe(60);
  });

  it("scan valid secara GPS tapi terlalu cepat -> TIDAK_VALID dengan alasan baku", () => {
    const hasil = evaluasi({
      waktuTempuh: { minDetik: 60, scanSebelumnyaDiPutaran: lalu(20) },
    });
    expect(hasil).toMatchObject({
      ditolak: false,
      status: "TIDAK_VALID",
      alasan: ALASAN_TERLALU_CEPAT,
      jarakM: 0,
    });
  });

  it("scan cukup lambat tetap VALID", () => {
    expect(
      evaluasi({ waktuTempuh: { minDetik: 60, scanSebelumnyaDiPutaran: lalu(120) } }).status,
    ).toBe("VALID");
  });

  it("alasan lain dipertahankan di belakang alasan terlalu cepat", () => {
    const hasil = evaluasi({
      akurasiM: PATROL_MAX_ACCURACY_M + 10,
      waktuTempuh: { minDetik: 60, scanSebelumnyaDiPutaran: lalu(5) },
    });
    expect(hasil.status).toBe("TIDAK_VALID");
    expect(hasil.alasan).toBe(ALASAN_TERLALU_CEPAT + "; akurasi GPS buruk");
  });

  it("titik tanpa koordinat yang dipindai terlalu cepat tidak lagi lolos sebagai BELUM_TERVERIFIKASI", () => {
    const hasil = evaluasi({
      posisiCheckpoint: null,
      waktuTempuh: { minDetik: 60, scanSebelumnyaDiPutaran: lalu(10) },
    });
    expect(hasil).toMatchObject({ status: "TIDAK_VALID", alasan: ALASAN_TERLALU_CEPAT });
  });

  it("scan yang ditolak (tidak bertugas) tetap ditolak, tidak berubah jadi log", () => {
    const hasil = evaluasi({
      sedangBertugas: false,
      waktuTempuh: { minDetik: 60, scanSebelumnyaDiPutaran: lalu(5) },
    });
    expect(hasil.ditolak).toBe(true);
  });
});

describe("parseRadius", () => {
  it("kosong = null (pakai bawaan)", () => {
    expect(parseRadius("")).toEqual({ ok: true, nilai: null });
    expect(parseRadius("  ")).toEqual({ ok: true, nilai: null });
  });
  it("menerima bilangan bulat dalam batas", () => {
    expect(parseRadius("10")).toEqual({ ok: true, nilai: 10 });
    expect(parseRadius("1000")).toEqual({ ok: true, nilai: 1000 });
    expect(parseRadius(" 35 ")).toEqual({ ok: true, nilai: 35 });
  });
  it("menolak di luar batas, desimal, dan bukan angka", () => {
    for (const buruk of ["9", "1001", "0", "-5", "25.5", "abc"]) {
      expect(parseRadius(buruk).ok).toBe(false);
    }
  });
});

describe("fallback jeda global (tanpa rute/jadwal)", () => {
  const SEKARANG = new Date("2026-10-27T10:00:00.000Z");
  const lalu = (detik: number) => new Date(SEKARANG.getTime() - detik * 1000);
  // Action memakai PATROL_MIN_JEDA_DETIK saat konteks rute tidak ada.
  const fallback = (detik: number) => ({
    minDetik: PATROL_MIN_JEDA_DETIK,
    scanSebelumnyaDiPutaran: lalu(detik),
  });

  it("bawaan 30 detik bila env tidak diatur", () => {
    expect(PATROL_MIN_JEDA_DETIK).toBe(30);
  });

  it("scan ke titik lain lebih cepat dari jeda global -> TIDAK_VALID", () => {
    expect(evaluasi({ waktuTempuh: fallback(10) })).toMatchObject({
      status: "TIDAK_VALID",
      alasan: ALASAN_TERLALU_CEPAT,
    });
  });

  it("tepat di batas atau lebih lambat tetap VALID", () => {
    expect(evaluasi({ waktuTempuh: fallback(PATROL_MIN_JEDA_DETIK) }).status).toBe("VALID");
    expect(evaluasi({ waktuTempuh: fallback(120) }).status).toBe("VALID");
  });

  it("tanpa scan sebelumnya dalam jendela jeda -> tidak ditandai", () => {
    expect(
      evaluasi({ waktuTempuh: { minDetik: PATROL_MIN_JEDA_DETIK, scanSebelumnyaDiPutaran: null } }).status,
    ).toBe("VALID");
  });
});
