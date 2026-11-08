import { describe, expect, it } from "vitest";

import {
  barisAbsensi,
  barisInsiden,
  barisPatroli,
  hariRentang,
  keWaktuWib,
  kumpulkanKeyThumbnail,
  statusHadirSel,
  statusScanSel,
  tautanFoto,
  thumbnailDiizinkan,
  urlFoto,
  urlMaps,
  type SumberAbsensi,
  type SumberInsiden,
  type SumberPatroli,
} from "./excel-baris";

const ORIGIN = "https://app.example.test";
const IDS = new Map([
  ["k-masuk", "foto-1"],
  ["k-keluar", "foto-2"],
  ["k-patroli", "foto-3"],
  ["k-insiden", "foto-4"],
]);

describe("keWaktuWib", () => {
  it("menggeser +7 jam agar jam dinding Excel = WIB", () => {
    const d = keWaktuWib(new Date("2026-11-07T17:30:00Z")); // 00:30 WIB tgl 8
    expect(d.getUTCDate()).toBe(8);
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(30);
  });
});

describe("url", () => {
  it("URL foto absolut tanpa garis miring ganda", () => {
    expect(urlFoto("https://a.test/", "abc")).toBe("https://a.test/api/foto/abc");
  });
  it("URL Google Maps", () => {
    expect(urlMaps(-6.2, 106.8)).toBe("https://www.google.com/maps?q=-6.2,106.8");
  });
  it("foto tanpa id terdaftar (base64 lama) -> null", () => {
    expect(tautanFoto(ORIGIN, "k-lama", IDS)).toBeNull();
    expect(tautanFoto(ORIGIN, null, IDS)).toBeNull();
    expect(tautanFoto(ORIGIN, "k-masuk", IDS)).toEqual({
      teks: "Lihat foto",
      url: `${ORIGIN}/api/foto/foto-1`,
      key: "k-masuk",
    });
  });
});

describe("status", () => {
  it("warna status hadir", () => {
    expect(statusHadirSel("TEPAT_WAKTU").warna).toBe("ok");
    expect(statusHadirSel("TELAT").warna).toBe("warn");
    expect(statusHadirSel("PULANG_CEPAT").warna).toBe("warn");
    expect(statusHadirSel("TIDAK_HADIR").warna).toBe("bad");
    expect(statusHadirSel(null)).toEqual({ teks: "Tanpa jadwal", warna: "netral" });
  });
  it("warna status scan", () => {
    expect(statusScanSel("VALID").warna).toBe("ok");
    expect(statusScanSel("TIDAK_VALID").warna).toBe("bad");
    expect(statusScanSel("BELUM_TERVERIFIKASI").warna).toBe("warn");
  });
});

const absensi: SumberAbsensi = {
  waktuMasuk: new Date("2026-11-07T23:55:00Z"), // 06:55 WIB 8 Nov
  waktuKeluar: null,
  statusHadir: "TELAT",
  latMasuk: "-6.2000000",
  longMasuk: "106.8166667",
  latKeluar: null,
  longKeluar: null,
  fotoMasuk: "k-masuk",
  fotoKeluar: "k-keluar",
  user: { nama: "Budi", regu: "Regu A" },
  shift: { nama: "Pagi" },
};

describe("barisAbsensi", () => {
  it("memetakan kolom, WIB, lokasi, dan foto", () => {
    const [b] = barisAbsensi([absensi], ORIGIN, IDS);
    expect(b.nama).toBe("Budi");
    expect(b.regu).toBe("Regu A");
    expect(b.shift).toBe("Pagi");
    expect(b.tanggal.getUTCDate()).toBe(8);
    expect(b.masuk.getUTCHours()).toBe(6);
    expect(b.masuk.getUTCMinutes()).toBe(55);
    expect(b.keluar).toBeNull();
    expect(b.status).toEqual({ teks: "Telat", warna: "warn" });
    expect(b.lokasiMasuk?.url).toBe("https://www.google.com/maps?q=-6.2,106.8166667");
    expect(b.lokasiMasuk?.teks).toBe("-6.200000, 106.816667");
    expect(b.lokasiKeluar).toBeNull();
    expect(b.fotoMasuk?.url).toBe(`${ORIGIN}/api/foto/foto-1`);
    expect(b.fotoKeluar?.url).toBe(`${ORIGIN}/api/foto/foto-2`);
  });

  it("regu & shift kosong menjadi '-'", () => {
    const [b] = barisAbsensi(
      [{ ...absensi, user: { nama: "X", regu: null }, shift: null, latMasuk: null }],
      ORIGIN,
      IDS,
    );
    expect(b.regu).toBe("-");
    expect(b.shift).toBe("-");
    expect(b.lokasiMasuk).toBeNull();
  });

  it("koordinat tidak valid tidak membuat tautan", () => {
    const [b] = barisAbsensi([{ ...absensi, latMasuk: "abc" }], ORIGIN, IDS);
    expect(b.lokasiMasuk).toBeNull();
  });
});

describe("barisPatroli", () => {
  const sumber: SumberPatroli = {
    waktu: new Date("2026-11-07T20:00:00Z"),
    status: "TIDAK_VALID",
    jarakM: 140,
    akurasiM: 22,
    alasan: "Di luar radius",
    lat: "-6.2",
    long: "106.8",
    foto: "k-patroli",
    user: { nama: "Sari", regu: "Regu B" },
    checkpoint: { namaTitik: "Lobi" },
  };

  it("memetakan kolom", () => {
    const [b] = barisPatroli([sumber], ORIGIN, IDS);
    expect(b.titik).toBe("Lobi");
    expect(b.status).toEqual({ teks: "Tidak valid", warna: "bad" });
    expect(b.jarakM).toBe(140);
    expect(b.akurasiM).toBe(22);
    expect(b.alasan).toBe("Di luar radius");
    expect(b.waktu.getUTCHours()).toBe(3); // 20:00Z = 03:00 WIB
    expect(b.foto?.url).toBe(`${ORIGIN}/api/foto/foto-3`);
  });

  it("alasan kosong menjadi '-'", () => {
    expect(barisPatroli([{ ...sumber, alasan: null }], ORIGIN, IDS)[0].alasan).toBe("-");
  });
});

describe("barisInsiden", () => {
  const sumber: SumberInsiden = {
    createdAt: new Date("2026-11-07T10:00:00Z"),
    kategori: "KERUSAKAN",
    prioritas: "DARURAT",
    status: "DITANGANI",
    deskripsi: "Pagar roboh",
    catatanTindakLanjut: null,
    fotoKeys: ["k-lama", "k-insiden"],
    user: { nama: "Adi", regu: null },
    penangan: { nama: "Danru A" },
    checkpoint: null,
  };

  it("memetakan label, warna, dan foto pertama yang terdaftar", () => {
    const [b] = barisInsiden([sumber], ORIGIN, IDS);
    expect(b.kategori).toBe("Kerusakan");
    expect(b.prioritas).toEqual({ teks: "Darurat", warna: "bad" });
    expect(b.status).toEqual({ teks: "Ditangani", warna: "warn" });
    expect(b.ditangani).toBe("Danru A");
    expect(b.catatan).toBe("-");
    expect(b.titik).toBe("-");
    expect(b.regu).toBe("-");
    expect(b.jumlahFoto).toBe(2);
    expect(b.foto?.url).toBe(`${ORIGIN}/api/foto/foto-4`);
  });
});

describe("thumbnail", () => {
  it("hariRentang inklusif", () => {
    expect(hariRentang("2026-11-01", "2026-11-01")).toBe(1);
    expect(hariRentang("2026-11-01", "2026-11-07")).toBe(7);
    expect(hariRentang("2026-11-07", "2026-11-01")).toBe(0);
  });

  it("diizinkan hanya untuk ≤ 7 hari", () => {
    expect(thumbnailDiizinkan("2026-11-01", "2026-11-07")).toBe(true);
    expect(thumbnailDiizinkan("2026-11-01", "2026-11-08")).toBe(false);
    expect(thumbnailDiizinkan("bukan", "tanggal")).toBe(false);
  });

  it("key unik dan dibatasi", () => {
    const t = (key: string) => ({ teks: "", url: "", key });
    expect(kumpulkanKeyThumbnail([t("a"), t("a"), null, t("b")])).toEqual(["a", "b"]);
    expect(kumpulkanKeyThumbnail([t("a"), t("b"), t("c")], 2)).toEqual(["a", "b"]);
  });
});
