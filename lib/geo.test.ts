import { describe, expect, it } from "vitest";

import {
  PATROL_MAX_ACCURACY_M,
  PATROL_MAX_SPEED_MPS,
  PATROL_MIN_INTERVAL_MS,
  PATROL_RADIUS_M,
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