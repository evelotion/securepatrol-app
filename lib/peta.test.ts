import { describe, expect, it } from "vitest";

import { petaRelatif } from "./peta";

const titik = { lat: -6.2, long: 106.8 };

describe("petaRelatif", () => {
  it("jarak nol: kedua titik di tengah", () => {
    const p = petaRelatif(titik, titik, 200);
    expect(p.jarakM).toBe(0);
    expect(p.hp).toEqual({ x: 100, y: 100 });
  });

  it("HP di utara tampil di atas titik, di timur tampil di kanan", () => {
    const utara = petaRelatif(titik, { lat: -6.199, long: 106.8 }, 200);
    expect(utara.hp.y).toBeLessThan(100);
    expect(utara.hp.x).toBeCloseTo(100);
    const timur = petaRelatif(titik, { lat: -6.2, long: 106.801 }, 200);
    expect(timur.hp.x).toBeGreaterThan(100);
  });

  it("jarak kira-kira benar (0,001° lintang ≈ 111 m)", () => {
    const p = petaRelatif(titik, { lat: -6.199, long: 106.8 }, 200);
    expect(p.jarakM).toBeGreaterThan(105);
    expect(p.jarakM).toBeLessThan(118);
  });

  it("titik jauh tetap di dalam kotak", () => {
    const p = petaRelatif(titik, { lat: -5.0, long: 108 }, 200);
    expect(p.hp.x).toBeGreaterThanOrEqual(0);
    expect(p.hp.x).toBeLessThanOrEqual(200);
    expect(p.hp.y).toBeGreaterThanOrEqual(0);
    expect(p.hp.y).toBeLessThanOrEqual(200);
  });
});
