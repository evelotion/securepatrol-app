import "server-only";

/**
 * Utilitas geolokasi (Blok 5).
 *
 * Dipanggil dari Server Action `logPatroli` untuk menghitung jarak antara
 * koordinat HP staf dan lokasi checkpoint, lalu menentukan `status_valid`.
 */

/** Radius bumi rata-rata (meter). */
const EARTH_RADIUS_M = 6_371_000;

/**
 * Radius toleransi validasi (meter). GPS gedung dalam ruangan biasanya
 * meleset puluhan meter, jadi defaultnya 100 m.
 * Bisa dioverride lewat env `PATROL_RADIUS_M`.
 */
export const PATROL_RADIUS_M = Number(process.env.PATROL_RADIUS_M ?? "") > 0
  ? Number(process.env.PATROL_RADIUS_M)
  : 100;

export type Koordinat = {
  lat: number;
  long: number;
};

/** true bila koordinat berada dalam rentang dunia yang valid. */
export function isValidKoordinat(koordinat: Partial<Koordinat>): boolean {
  const { lat, long } = koordinat;
  return (
    typeof lat === "number" &&
    typeof long === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(long) &&
    lat >= -90 &&
    lat <= 90 &&
    long >= -180 &&
    long <= 180
  );
}

/**
 * Haversine formula — jarak lingkaran besar antara dua titik koordinat,
 * dalam meter.
 */
export function haversineMeters(from: Koordinat, to: Koordinat): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(to.lat - from.lat);
  const dLong = toRad(to.long - from.long);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLong / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

/**
 * Validasi keberadaan staf di titik checkpoint.
 *
 * - Checkpoint belum punya koordinat  -> tidak bisa divalidasi, anggap valid.
 * - HP tidak memberikan koordinat     -> tidak valid (tidak ada bukti GPS).
 */
export function statusValidasi(
  posisiHP: Partial<Koordinat> | null,
  posisiCheckpoint: Partial<Koordinat> | null,
): { statusValid: boolean; jarak: number | null } {
  const cpAda =
    posisiCheckpoint !== null &&
    isValidKoordinat({
      lat: posisiCheckpoint.lat ?? undefined,
      long: posisiCheckpoint.long ?? undefined,
    });

  // Titik belum dipetakan: tidak ada patokan jarak, scan tetap diterima.
  if (!cpAda) return { statusValid: true, jarak: null };

  if (
    posisiHP === null ||
    !isValidKoordinat({
      lat: posisiHP.lat ?? undefined,
      long: posisiHP.long ?? undefined,
    })
  ) {
    return { statusValid: false, jarak: null };
  }

  const jarak = haversineMeters(
    { lat: posisiHP.lat as number, long: posisiHP.long as number },
    { lat: posisiCheckpoint.lat as number, long: posisiCheckpoint.long as number },
  );

  return { statusValid: jarak <= PATROL_RADIUS_M, jarak };
}
