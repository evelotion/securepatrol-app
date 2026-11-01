/**
 * Utilitas patroli yang murni (tanpa akses DB) agar semua aturan Fase 2
 * dapat diuji dengan input sintetis dari `lib/geo.test.ts`.
 */

const EARTH_RADIUS_M = 6_371_000;

/** Radius checkpoint (meter); dapat dikonfigurasi lewat env. */
export const PATROL_RADIUS_M = Number(process.env.PATROL_RADIUS_M ?? "") > 0
  ? Number(process.env.PATROL_RADIUS_M)
  : 100;

/** Akurasi maksimum GPS (meter); dapat dikonfigurasi lewat env. */
export const PATROL_MAX_ACCURACY_M =
  Number(process.env.PATROL_MAX_ACCURACY_M ?? "") > 0
    ? Number(process.env.PATROL_MAX_ACCURACY_M)
    : 50;

export const PATROL_MIN_INTERVAL_MS = 10 * 60 * 1000;
export const PATROL_MAX_SPEED_MPS = 3;

export type StatusScan = "VALID" | "TIDAK_VALID" | "BELUM_TERVERIFIKASI";

export type Koordinat = {
  lat: number;
  long: number;
};

export type ScanSebelumnya = {
  waktu: Date;
  posisi: Koordinat | null;
};

export type ValidasiScanInput = {
  checkpointId: string;
  sekarang: Date;
  posisiHP: Koordinat | null;
  akurasiM: number | null;
  posisiCheckpoint: Koordinat | null;
  scanSebelumnya: ScanSebelumnya | null;
  scanCheckpointSebelumnya: Date | null;
  sedangBertugas: boolean;
  radiusM?: number;
  akurasiMaksM?: number;
};

export type HasilValidasiScan = {
  ditolak: boolean;
  pesanTolak: string | null;
  status: StatusScan;
  alasan: string | null;
  jarakM: number | null;
  akurasiM: number | null;
};

/** true bila koordinat berada dalam rentang dunia yang valid. */
export function isValidKoordinat(
  koordinat: Partial<Koordinat> | null,
): koordinat is Koordinat {
  if (!koordinat) return false;
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

/** Haversine formula — jarak lingkaran besar antara dua koordinat, dalam meter. */
export function haversineMeters(from: Koordinat, to: Koordinat): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLong = toRad(to.long - from.long);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLong / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ditolak(mesin: string): HasilValidasiScan {
  return {
    ditolak: true,
    pesanTolak: mesin,
    status: "TIDAK_VALID",
    alasan: null,
    jarakM: null,
    akurasiM: null,
  };
}

/**
 * Evaluasi aturan patroli dalam urutan persis seperti spec Fase 2.
 * Rules 5 dan 7 menolak scan (tidak membuat log); rules lainnya menghasilkan
 * log dengan status bertingkat dan alasan pertama yang cocok.
 */
export function validasiScan(input: ValidasiScanInput): HasilValidasiScan {
  const {
    sekarang,
    posisiHP,
    akurasiM,
    posisiCheckpoint,
    scanSebelumnya,
    scanCheckpointSebelumnya,
    sedangBertugas,
    radiusM = PATROL_RADIUS_M,
    akurasiMaksM = PATROL_MAX_ACCURACY_M,
  } = input;

  // Syarat sedang bertugas adalah hard gate dari kriteria terima: tidak
  // boleh menyimpan scan tanpa absensi terbuka, termasuk checkpoint tanpa GPS.
  if (!sedangBertugas) {
    return ditolak("Patroli hanya bisa dilakukan saat sedang bertugas");
  }

  // 1. Checkpoint tanpa koordinat tidak bisa diverifikasi; aturan ini
  //    didahulukan dari absennya GPS HP dan aturan lainnya.
  if (!isValidKoordinat(posisiCheckpoint)) {
    return {
      ditolak: false,
      pesanTolak: null,
      status: "BELUM_TERVERIFIKASI",
      alasan: "titik belum dipetakan",
      jarakM: null,
      akurasiM,
    };
  }

  // 2. HP tidak mengirim lokasi.
  if (!isValidKoordinat(posisiHP)) {
    return {
      ditolak: false,
      pesanTolak: null,
      status: "TIDAK_VALID",
      alasan: "lokasi GPS tidak tersedia",
      jarakM: null,
      akurasiM,
    };
  }

  // 3. GPS tidak mengirim accuracy atau akurasinya melebihi ambang.
  if (akurasiM === null || !Number.isFinite(akurasiM) || akurasiM < 0 || akurasiM > akurasiMaksM) {
    return {
      ditolak: false,
      pesanTolak: null,
      status: "TIDAK_VALID",
      alasan: "akurasi GPS buruk",
      jarakM: null,
      akurasiM,
    };
  }

  const jarak = haversineMeters(posisiHP, posisiCheckpoint);
  const jarakM = Math.round(jarak);

  // 4. Di luar radius checkpoint.
  if (jarak > radiusM) {
    return {
      ditolak: false,
      pesanTolak: null,
      status: "TIDAK_VALID",
      alasan: "di luar radius",
      jarakM,
      akurasiM: Math.round(akurasiM),
    };
  }

  // 5. Checkpoint yang sama kurang dari 10 menit: tolak, jangan simpan.
  if (
    scanCheckpointSebelumnya &&
    sekarang.getTime() - scanCheckpointSebelumnya.getTime() < PATROL_MIN_INTERVAL_MS
  ) {
    return ditolak("Titik ini baru saja dipindai");
  }

  // 6. Perpindahan dari scan sebelumnya lebih cepat dari 3 m/s.
  if (scanSebelumnya?.posisi && isValidKoordinat(scanSebelumnya.posisi)) {
    const durasiDetik = (sekarang.getTime() - scanSebelumnya.waktu.getTime()) / 1000;
    if (durasiDetik > 0) {
      const kecepatan = haversineMeters(scanSebelumnya.posisi, posisiHP) / durasiDetik;
      if (kecepatan > PATROL_MAX_SPEED_MPS) {
        return {
          ditolak: false,
          pesanTolak: null,
          status: "TIDAK_VALID",
          alasan: "perpindahan tidak wajar",
          jarakM,
          akurasiM: Math.round(akurasiM),
        };
      }
    }
  }

  return {
    ditolak: false,
    pesanTolak: null,
    status: "VALID",
    alasan: null,
    jarakM,
    akurasiM: Math.round(akurasiM),
  };
}
