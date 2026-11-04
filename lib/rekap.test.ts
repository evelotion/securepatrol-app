import { describe, expect, it } from "vitest";

import {
  persen,
  rekapKehadiran,
  rekapPatroli,
  ringkasan,
  type AgregatAbsensi,
  type AgregatPatroli,
  type Orang,
} from "./rekap";

const ORANG: Orang[] = [
  { id: "u2", nama: "Budi", regu: "Regu A" },
  { id: "u1", nama: "Ali", regu: "Regu A" },
  { id: "u3", nama: "Candra", regu: null },
];

describe("rekapKehadiran", () => {
  const agregat: AgregatAbsensi[] = [
    { userId: "u1", statusHadir: "TEPAT_WAKTU", jumlah: 10 },
    { userId: "u1", statusHadir: "TELAT", jumlah: 2 },
    { userId: "u1", statusHadir: "TIDAK_HADIR", jumlah: 1 },
    { userId: "u2", statusHadir: null, jumlah: 3 },
    { userId: "u2", statusHadir: "PULANG_CEPAT", jumlah: 1 },
    { userId: "asing", statusHadir: "TELAT", jumlah: 9 },
  ];

  it("menghitung per orang; tidak hadir tidak masuk 'hadir'", () => {
    const rows = rekapKehadiran(ORANG, agregat);
    const ali = rows.find((r) => r.id === "u1");
    expect(ali).toMatchObject({ hadir: 12, tepatWaktu: 10, telat: 2, tidakHadir: 1 });
    const budi = rows.find((r) => r.id === "u2");
    expect(budi).toMatchObject({ hadir: 4, tanpaJadwal: 3, pulangCepat: 1 });
  });

  it("orang tanpa data tetap tampil dengan nol; data user asing diabaikan", () => {
    const rows = rekapKehadiran(ORANG, agregat);
    expect(rows.find((r) => r.id === "u3")).toMatchObject({ hadir: 0, tidakHadir: 0 });
    expect(rows).toHaveLength(3);
  });

  it("urut regu lalu nama; tanpa regu paling akhir", () => {
    expect(rekapKehadiran(ORANG, []).map((r) => r.nama)).toEqual(["Ali", "Budi", "Candra"]);
  });
});

describe("rekapPatroli", () => {
  const agregat: AgregatPatroli[] = [
    { userId: "u1", checkpointId: "c1", status: "VALID", jumlah: 4 },
    { userId: "u1", checkpointId: "c1", status: "TIDAK_VALID", jumlah: 1 },
    { userId: "u1", checkpointId: "c2", status: "BELUM_TERVERIFIKASI", jumlah: 2 },
    { userId: "u2", checkpointId: "c2", status: "VALID", jumlah: 3 },
  ];

  it("menghitung scan, status, dan titik unik per orang", () => {
    const rows = rekapPatroli(ORANG, agregat, 4);
    const ali = rows.find((r) => r.id === "u1");
    expect(ali).toMatchObject({
      scan: 7,
      valid: 4,
      tidakValid: 1,
      belumTerverifikasi: 2,
      titikUnik: 2,
      persenTitik: 50,
    });
  });

  it("persen aman bila tidak ada titik aktif", () => {
    expect(rekapPatroli(ORANG, agregat, 0)[0]?.persenTitik).toBe(0);
    expect(persen(5, 0)).toBe(0);
    expect(persen(9, 4)).toBe(100);
  });
});

describe("ringkasan", () => {
  it("menjumlahkan dan menghitung titik unik lintas orang", () => {
    const abs: AgregatAbsensi[] = [
      { userId: "u1", statusHadir: "TELAT", jumlah: 2 },
      { userId: "u2", statusHadir: "TIDAK_HADIR", jumlah: 1 },
    ];
    const pat: AgregatPatroli[] = [
      { userId: "u1", checkpointId: "c1", status: "VALID", jumlah: 2 },
      { userId: "u2", checkpointId: "c2", status: "TIDAK_VALID", jumlah: 1 },
    ];
    const r = ringkasan(rekapKehadiran(ORANG, abs), rekapPatroli(ORANG, pat, 4), pat, 4);
    expect(r).toMatchObject({
      personel: 3,
      hadir: 2,
      telat: 2,
      tidakHadir: 1,
      scan: 3,
      tidakValid: 1,
      persenTitikTerpatroli: 50,
    });
  });
});
