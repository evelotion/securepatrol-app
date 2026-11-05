/** Posisi relatif titik vs HP untuk diagram kecil (F4-6) — murni, tanpa peta eksternal. */

export type Titik = { lat: number; long: number };

const METER_PER_DERAJAT = 111_320;

export type PetaRelatif = {
  /** Koordinat piksel dalam kotak `ukuran` x `ukuran`; titik acuan di tengah. */
  titik: { x: number; y: number };
  hp: { x: number; y: number };
  /** Jarak lurus dalam meter (pendekatan datar, akurat untuk jarak pendek). */
  jarakM: number;
};

export function petaRelatif(titik: Titik, hp: Titik, ukuran: number): PetaRelatif {
  const tengah = ukuran / 2;
  const dxM = (hp.long - titik.long) * METER_PER_DERAJAT * Math.cos((titik.lat * Math.PI) / 180);
  const dyM = (hp.lat - titik.lat) * METER_PER_DERAJAT;
  const jarakM = Math.hypot(dxM, dyM);

  // Skala: titik terjauh memakai 80% setengah kotak; jarak nol tetap di tengah.
  const batas = Math.max(Math.abs(dxM), Math.abs(dyM));
  const skala = batas === 0 ? 0 : (tengah * 0.8) / batas;

  return {
    titik: { x: tengah, y: tengah },
    // Sumbu y piksel menghadap ke bawah, utara ke atas.
    hp: { x: tengah + dxM * skala, y: tengah - dyM * skala },
    jarakM,
  };
}
