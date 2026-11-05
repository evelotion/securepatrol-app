import { describe, expect, it } from "vitest";

import {
  absensiCocokJadwal,
  jadwalBerlaku,
  nilaiTidakHadir,
  rentangKehadiran,
  rentangKueriAbsensi,
  tanggalPenilaian,
  type AbsensiCocok,
  type JadwalBertanggal,
  type JadwalPenilaian,
  type ShiftBerjadwal,
} from "./kehadiran";
import { jendelaShift, statusMasuk } from "./shift";

const wib = (iso: string): Date => new Date(iso);

const SHIFT_MALAM: ShiftBerjadwal = {
  id: "shift-malam",
  nama: "Malam",
  jamMulai: "22:00",
  jamSelesai: "06:00",
  toleransiTelatMenit: 15,
};

const SHIFT_PAGI: ShiftBerjadwal = {
  id: "shift-pagi",
  nama: "Pagi",
  jamMulai: "08:00",
  jamSelesai: "16:00",
  toleransiTelatMenit: 15,
};

const absensi = (
  waktuMasuk: Date,
  shiftId: string | null,
  statusHadir: string | null = "TEPAT_WAKTU",
): AbsensiCocok => ({ userId: "u1", waktuMasuk, shiftId, statusHadir });

const jadwalMalam = (
  jadwalId = "jadwal-malam",
  userId = "u1",
): JadwalPenilaian => ({
  jadwalId,
  userId,
  shiftId: SHIFT_MALAM.id,
  shift: SHIFT_MALAM,
});

describe("rentangKehadiran", () => {
  it("memundurkan batas bawah 2 jam dari jam mulai shift", () => {
    const rentang = rentangKehadiran("2026-11-04", SHIFT_MALAM)!;
    // 22:00 WIB -> 15:00Z, toleransi 2 jam -> 20:00 WIB.
    expect(rentang.mulai.toISOString()).toBe("2026-11-04T13:00:00.000Z");
    expect(rentang.selesai.toISOString()).toBe("2026-11-04T23:00:00.000Z");
  });

  it("null bila jam shift tidak valid", () => {
    expect(
      rentangKehadiran("2026-11-04", { ...SHIFT_MALAM, jamMulai: "22:0" }),
    ).toBeNull();
  });
});

describe("check-in lebih awal bukan tidak hadir (item b)", () => {
  it("absen 21:50 untuk shift 22:00 dihitung hadir dan TEPAT_WAKTU", () => {
    const masuk = wib("2026-11-04T21:50:00+07:00");

    // Jendela shift sendiri baru mulai 22:00 — karena itu toleransi 2 jam.
    expect(jendelaShift("2026-11-04", SHIFT_MALAM)!.mulai.toISOString()).toBe(
      "2026-11-04T15:00:00.000Z",
    );
    expect(absensiCocokJadwal("2026-11-04", SHIFT_MALAM, absensi(masuk, null))).toBe(
      true,
    );
    expect(statusMasuk(masuk, SHIFT_MALAM, "2026-11-04")).toBe("TEPAT_WAKTU");

    // Cron tidak boleh membuat baris TIDAK_HADIR untuk jadwal itu.
    const keputusan = nilaiTidakHadir(
      "2026-11-04",
      [jadwalMalam("2026-11-04")],
      [absensi(masuk, null)],
      wib("2026-11-06T00:10:00+07:00"),
    );
    expect(keputusan[0].alasan).toBe("HADIR");
  });

  it("absensi bertanda shiftId sama tetap hadir walau jam masuk jauh lebih awal", () => {
    const masuk = wib("2026-11-04T19:00:00+07:00");

    // Di luar toleransi 2 jam, tapi shift-nya ditandai eksplisit.
    expect(absensiCocokJadwal("2026-11-04", SHIFT_MALAM, absensi(masuk, null))).toBe(
      false,
    );
    expect(
      absensiCocokJadwal("2026-11-04", SHIFT_MALAM, absensi(masuk, SHIFT_MALAM.id)),
    ).toBe(true);
  });

  it("shift pagi yang sudah lewat tidak menutupi shift malam", () => {
    const masuk = wib("2026-11-04T09:00:00+07:00");
    expect(
      absensiCocokJadwal("2026-11-04", SHIFT_MALAM, absensi(masuk, SHIFT_PAGI.id)),
    ).toBe(false);
  });
});

describe("jadwalBerlaku (item c)", () => {
  it("absen 00:30 memilih jadwal shift malam kemarin, bukan jadwal hari ini", () => {
    const sekarang = wib("2026-11-05T00:30:00+07:00");
    const kandidat: JadwalBertanggal[] = [
      { tanggal: "2026-11-05", shift: SHIFT_PAGI },
      { tanggal: "2026-11-04", shift: SHIFT_MALAM },
    ];

    const terpilih = jadwalBerlaku(sekarang, kandidat);
    expect(terpilih?.tanggal).toBe("2026-11-04");
    expect(terpilih?.shift.id).toBe("shift-malam");
    // 22:00 + 15 menit sudah lewat -> TELAT, dihitung dari jadwal kemarin.
    expect(statusMasuk(sekarang, terpilih!.shift, terpilih!.tanggal)).toBe("TELAT");
  });

  it("absen 21:00 memilih shift malam hari ini, bukan shift malam kemarin", () => {
    const sekarang = wib("2026-11-04T21:00:00+07:00");
    const kandidat: JadwalBertanggal[] = [
      { tanggal: "2026-11-04", shift: SHIFT_MALAM },
      { tanggal: "2026-11-03", shift: SHIFT_MALAM },
    ];

    const terpilih = jadwalBerlaku(sekarang, kandidat);
    expect(terpilih?.tanggal).toBe("2026-11-04");
    expect(statusMasuk(sekarang, terpilih!.shift, terpilih!.tanggal)).toBe(
      "TEPAT_WAKTU",
    );
  });

  it("null bila tidak ada jadwal yang jendelanya memuat sekarang", () => {
    expect(
      jadwalBerlaku(wib("2026-11-04T12:00:00+07:00"), [
        { tanggal: "2026-11-04", shift: SHIFT_MALAM },
        { tanggal: "2026-11-03", shift: SHIFT_MALAM },
      ]),
    ).toBeNull();
  });
});

describe("tanggalPenilaian (item a)", () => {
  it("mengembalikan kemarin dan kemarin lusa (WIB)", () => {
    expect(tanggalPenilaian(wib("2026-11-05T00:10:00+07:00"))).toEqual([
      "2026-11-04",
      "2026-11-03",
    ]);
    // 00:10 WIB tanggal 5 masih 4 Nov di UTC — tidak boleh bergeser.
    expect(tanggalPenilaian(wib("2026-11-04T17:10:00Z"))).toEqual([
      "2026-11-04",
      "2026-11-03",
    ]);
  });
});

describe("shift malam kemarin tetap tertandai cron hari berikutnya (item a)", () => {
  it("cron D+1 belum menilai, cron D+2 menandai TIDAK_HADIR", () => {
    const jadwal = [jadwalMalam("2026-11-04")];

    // Cron 5 Nov 00:10 WIB: shift malam 4 Nov baru selesai 06:00 -> belum.
    const dPlus1 = nilaiTidakHadir(
      "2026-11-04",
      jadwal,
      [],
      wib("2026-11-05T00:10:00+07:00"),
    );
    expect(dPlus1[0].alasan).toBe("BELUM_SELESAI");

    // Cron 6 Nov 00:10 WIB: jadwal 4 Nov masuk jendela "kemarin lusa".
    const sekarang = wib("2026-11-06T00:10:00+07:00");
    expect(tanggalPenilaian(sekarang)).toContain("2026-11-04");

    const dPlus2 = nilaiTidakHadir("2026-11-04", jadwal, [], sekarang);
    expect(dPlus2.map((k) => k.alasan)).toEqual(["DITANDAI"]);
    // Baris dibuat pada jendela shift, bukan jam sekarang.
    expect(dPlus2[0].jendela.mulai.toISOString()).toBe(
      "2026-11-04T15:00:00.000Z",
    );
    expect(dPlus2[0].jendela.selesai.toISOString()).toBe(
      "2026-11-04T23:00:00.000Z",
    );
  });

  it("absensi dinihari 00:30 sudah dihitung hadir untuk shift malam kemarin", () => {
    const keputusan = nilaiTidakHadir(
      "2026-11-04",
      [jadwalMalam("2026-11-04")],
      [absensi(wib("2026-11-05T00:30:00+07:00"), SHIFT_MALAM.id, "TELAT")],
      wib("2026-11-06T00:10:00+07:00"),
    );
    expect(keputusan[0].alasan).toBe("HADIR");
  });
});

describe("rentangKueriAbsensi (batas bawah query cron)", () => {
  it("batas bawah mundur sebesar toleransi awal dari 00:00 WIB", () => {
    const { gte, lt } = rentangKueriAbsensi("2026-11-05");
    // 00:00 WIB 5 Nov = 4 Nov 17:00 UTC; dikurangi 2 jam = 15:00 UTC (22:00 WIB 4 Nov).
    expect(gte.toISOString()).toBe("2026-11-04T15:00:00.000Z");
    // 00:00 WIB 7 Nov.
    expect(lt.toISOString()).toBe("2026-11-06T17:00:00.000Z");
  });

  it("check-in 23:00 WIB hari sebelumnya untuk shift 00:30 masuk rentang dan tidak ditandai", () => {
    const shiftDinihari: ShiftBerjadwal = {
      id: "shift-dinihari",
      nama: "Dinihari",
      jamMulai: "00:30",
      jamSelesai: "08:00",
      toleransiTelatMenit: 15,
    };
    const masuk = wib("2026-11-04T23:00:00+07:00");
    const { gte } = rentangKueriAbsensi("2026-11-05");
    // Dulu batas bawahnya 00:00 WIB 5 Nov, sehingga baris ini tidak ikut terambil.
    expect(masuk.getTime()).toBeGreaterThanOrEqual(gte.getTime());

    const keputusan = nilaiTidakHadir(
      "2026-11-05",
      [
        {
          jadwalId: "j",
          userId: "u1",
          shiftId: shiftDinihari.id,
          shift: shiftDinihari,
        },
      ],
      [absensi(masuk, shiftDinihari.id)],
      wib("2026-11-06T00:10:00+07:00"),
    );
    expect(keputusan[0].alasan).toBe("HADIR");
  });
});

describe("idempotensi cron (item a)", () => {
  it("dijalankan dua kali tidak menghasilkan baris TIDAK_HADIR ganda", () => {
    const sekarang = wib("2026-11-06T00:10:00+07:00");
    const jadwal = [jadwalMalam(), jadwalMalam("jadwal-malam-2", "u2")];

    const pertama = nilaiTidakHadir("2026-11-04", jadwal, [], sekarang);
    expect(pertama.map((k) => k.alasan)).toEqual(["DITANDAI", "DITANDAI"]);

    // Simulasikan baris yang baru saja dibuat cron.
    const dibuat: AbsensiCocok[] = pertama
      .filter((k) => k.alasan === "DITANDAI")
      .map((k) => ({
        userId: k.jadwal.userId,
        shiftId: k.jadwal.shiftId,
        waktuMasuk: k.jendela.mulai,
        statusHadir: "TIDAK_HADIR",
      }));

    const kedua = nilaiTidakHadir("2026-11-04", jadwal, dibuat, sekarang);
    expect(kedua.map((k) => k.alasan)).toEqual(["SUDAH_DITANDAI", "SUDAH_DITANDAI"]);
    expect(kedua.filter((k) => k.alasan === "DITANDAI")).toHaveLength(0);
  });
});
