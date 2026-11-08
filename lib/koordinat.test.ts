import { describe, expect, it } from "vitest";

import {
  formatKoordinat,
  gabungkanSampelGps,
  parseTautanMaps,
  peringatanAkurasi,
} from "./koordinat";

describe("parseTautanMaps", () => {
  it("format @lat,long", () => {
    expect(
      parseTautanMaps("https://www.google.com/maps/place/Monas/@-6.1753924,106.8271528,17z/data=abc"),
    ).toEqual({ lat: -6.1753924, long: 106.8271528 });
  });

  it("format ?q=lat,long", () => {
    expect(parseTautanMaps("https://maps.google.com/?q=-6.2,106.8166")).toEqual({
      lat: -6.2,
      long: 106.8166,
    });
    expect(parseTautanMaps("https://www.google.com/maps?q=-6.2%2C106.8166")).toEqual({
      lat: -6.2,
      long: 106.8166,
    });
  });

  it("data tempat !3d!4d diutamakan atas pusat peta @", () => {
    expect(
      parseTautanMaps("https://www.google.com/maps/place/X/@-6.1,106.1,17z/data=!3m1!4b1!3d-6.2222222!4d106.3333333"),
    ).toEqual({ lat: -6.2222222, long: 106.3333333 });
  });

  it("koordinat polos 'lat, long' tidak dianggap tautan", () => {
    expect(parseTautanMaps("-6.2, 106.8")).toBeNull();
  });

  it("menolak teks tanpa koordinat, kosong, dan di luar rentang", () => {
    expect(parseTautanMaps("")).toBeNull();
    expect(parseTautanMaps("https://maps.app.goo.gl/abc123")).toBeNull();
    expect(parseTautanMaps("https://x/?q=95,10")).toBeNull();
    expect(parseTautanMaps("https://x/@10,200,17z")).toBeNull();
  });
});

describe("gabungkanSampelGps", () => {
  it("satu sampel dikembalikan apa adanya", () => {
    const hasil = gabungkanSampelGps([{ lat: -6.2, long: 106.8, accuracy: 12.4 }])!;
    expect(hasil.lat).toBeCloseTo(-6.2, 9);
    expect(hasil.long).toBeCloseTo(106.8, 9);
    expect(hasil.accuracy).toBe(12);
    expect(hasil.sampel).toBe(1);
  });

  it("memakai separuh sampel terbaik dan mengabaikan yang akurasinya buruk", () => {
    const hasil = gabungkanSampelGps([
      { lat: -6.2, long: 106.8, accuracy: 8 },
      { lat: -6.2002, long: 106.8002, accuracy: 10 },
      { lat: -6.25, long: 106.9, accuracy: 120 },
      { lat: -6.26, long: 106.91, accuracy: 200 },
    ])!;
    expect(hasil.sampel).toBe(2);
    expect(hasil.accuracy).toBe(8);
    expect(hasil.lat).toBeLessThan(-6.2);
    expect(hasil.lat).toBeGreaterThan(-6.2002);
    // Bobot 1/akurasi²: lebih dekat ke sampel 8 m.
    expect(Math.abs(hasil.lat - -6.2)).toBeLessThan(Math.abs(hasil.lat - -6.2002));
  });

  it("membuang sampel tak valid; null bila tak ada yang layak", () => {
    expect(gabungkanSampelGps([])).toBeNull();
    expect(gabungkanSampelGps([{ lat: NaN, long: 1, accuracy: 5 }])).toBeNull();
    expect(
      gabungkanSampelGps([
        { lat: 99, long: 1, accuracy: 1 },
        { lat: -6.2, long: 106.8, accuracy: 20 },
      ])?.lat,
    ).toBeCloseTo(-6.2, 9);
  });

  it("akurasi tak diketahui menghasilkan accuracy null", () => {
    expect(gabungkanSampelGps([{ lat: -6.2, long: 106.8, accuracy: null }])?.accuracy).toBeNull();
  });
});

describe("peringatanAkurasi & formatKoordinat", () => {
  it("memperingatkan hanya bila > 30 m atau tak diketahui", () => {
    expect(peringatanAkurasi(30)).toBeNull();
    expect(peringatanAkurasi(31)).toMatch(/±31 m/);
    expect(peringatanAkurasi(null)).toMatch(/tidak diketahui/);
  });

  it("7 desimal", () => {
    expect(formatKoordinat(-6.2)).toBe("-6.2000000");
  });
});
