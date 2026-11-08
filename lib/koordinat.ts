/**
 * Utilitas koordinat murni untuk form checkpoint: parsing tautan Google Maps
 * dan penggabungan beberapa sampel GPS. Tanpa DOM/DB agar mudah diuji.
 */

export type TitikKoordinat = { lat: number; long: number };

export type SampelGps = {
  lat: number;
  long: number;
  /** Meter; null bila perangkat tidak melaporkan akurasi. */
  accuracy: number | null;
};

export type HasilGps = TitikKoordinat & { accuracy: number | null; sampel: number };

/** Batas akurasi (meter) di atas ini admin diperingatkan. */
export const AKURASI_PERINGATAN_M = 30;

function valid(lat: number, long: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(long) &&
    Math.abs(lat) <= 90 &&
    Math.abs(long) <= 180
  );
}

const ANGKA = String.raw`-?\d{1,3}(?:\.\d+)?`;

/**
 * Ambil lat/long dari tautan Google Maps. Didukung:
 * - `.../@-6.2000,106.8166,17z`
 * - `...?q=-6.2,106.8` (juga `query=`, `ll=`, `destination=`)
 * - `...!3d-6.2!4d106.8` (bagian data pada tautan tempat)
 * Tautan pendek (maps.app.goo.gl) tidak bisa diurai tanpa mengikuti redirect.
 * Mengembalikan null bila tidak ada koordinat valid.
 */
export function parseTautanMaps(teks: string): TitikKoordinat | null {
  const masukan = teks.trim();
  if (!masukan) return null;

  let bersih = masukan;
  try {
    bersih = decodeURIComponent(masukan);
  } catch {
    /* biarkan apa adanya */
  }

  const pola: RegExp[] = [
    // Data tempat lebih presisi daripada pusat peta, jadi dicoba lebih dulu.
    new RegExp(String.raw`!3d(${ANGKA})!4d(${ANGKA})`),
    new RegExp(String.raw`@(${ANGKA}),\s*(${ANGKA})`),
    new RegExp(String.raw`[?&](?:q|query|ll|destination|center)=(${ANGKA})(?:,|\s)\s*(${ANGKA})`),
  ];

  for (const re of pola) {
    const m = re.exec(bersih);
    if (!m) continue;
    const lat = Number(m[1]);
    const long = Number(m[2]);
    if (valid(lat, long)) return { lat, long };
  }
  return null;
}

/**
 * Gabungkan sampel GPS: buang sampel tanpa koordinat valid, ambil separuh
 * terbaik berdasarkan akurasi (minimal 1), lalu rata-ratakan dengan bobot
 * 1/akurasi². Akurasi hasil = akurasi terbaik di antara sampel terpilih.
 */
export function gabungkanSampelGps(sampel: SampelGps[]): HasilGps | null {
  const layak = sampel.filter((s) => valid(s.lat, s.long));
  if (layak.length === 0) return null;

  const diurut = [...layak].sort(
    (a, b) => (a.accuracy ?? Infinity) - (b.accuracy ?? Infinity),
  );
  const terpilih = diurut.slice(0, Math.max(1, Math.ceil(diurut.length / 2)));

  let bobotTotal = 0;
  let lat = 0;
  let long = 0;
  for (const s of terpilih) {
    // Tanpa akurasi dianggap buruk (100 m) agar tidak mendominasi.
    const acc = Math.max(s.accuracy ?? 100, 1);
    const bobot = 1 / (acc * acc);
    bobotTotal += bobot;
    lat += s.lat * bobot;
    long += s.long * bobot;
  }

  const terbaik = terpilih[0].accuracy;
  return {
    lat: lat / bobotTotal,
    long: long / bobotTotal,
    accuracy: terbaik === null ? null : Math.round(terbaik),
    sampel: terpilih.length,
  };
}

/** Teks peringatan bila akurasi buruk, atau null bila cukup baik. */
export function peringatanAkurasi(accuracy: number | null): string | null {
  if (accuracy === null) return "Akurasi GPS tidak diketahui. Coba ulangi di tempat terbuka.";
  if (accuracy > AKURASI_PERINGATAN_M) {
    return `Akurasi ±${accuracy} m kurang baik (> ${AKURASI_PERINGATAN_M} m). Pindah ke tempat terbuka lalu coba lagi.`;
  }
  return null;
}

/** Format koordinat untuk kolom input (7 desimal ≈ 1 cm). */
export function formatKoordinat(nilai: number): string {
  return nilai.toFixed(7);
}
