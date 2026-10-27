import { describe, expect, it } from "vitest";

import {
  batasAbsensiTerbuka,
  jamWIB,
  JENDELA_ABSENSI_JAM,
  OFFSET_WIB_MS,
  sisaMenit,
  startOfHariWIB,
  tanggalWIB,
} from "./waktu";

/** Helper: ISO dengan offset WIB eksplisit. */
const wib = (iso: string): Date => new Date(iso);

describe("startOfHariWIB", () => {
  it("mengembalikan 00:00 WIB hari yang sedang berjalan", () => {
    // 27 Okt 2026 22:00 WIB = 27 Okt 15:00 UTC
    expect(startOfHariWIB(wib("2026-10-27T22:00:00+07:00"))).toEqual(
      new Date("2026-10-26T17:00:00.000Z"), // 27 Okt 00:00 WIB
    );
  });

  it("tepat tengah malam WIB dihitung sebagai awal hari itu", () => {
    expect(startOfHariWIB(wib("2026-10-27T00:00:00+07:00"))).toEqual(
      new Date("2026-10-26T17:00:00.000Z"),
    );
  });

  it("menit terakhir sebelum tengah malam masih hari yang sama", () => {
    expect(startOfHariWIB(wib("2026-10-27T23:59:59+07:00"))).toEqual(
      new Date("2026-10-26T17:00:00.000Z"),
    );
  });

  it("TIDAK memakai batas hari server (UTC) — bug F1-1", () => {
    // 27 Okt 06:30 WIB = 26 Okt 23:30 UTC.
    // Dengan jam server, "hari ini" sudah berganti ke 26 Okt 00:00 UTC;
    // dengan WIB, hari masih 27 Okt.
    const now = wib("2026-10-27T06:30:00+07:00"); // 2026-10-26T23:30:00Z
    const start = startOfHariWIB(now);
    expect(start).toEqual(new Date("2026-10-26T17:00:00.000Z"));
    expect(start.toISOString()).not.toBe(
      new Date(Date.UTC(2026, 9, 26)).toISOString(),
    );
    // Berada 6,5 jam setelah awal hari WIB (06:30), sesuai zona Asia/Jakarta.
    expect(now.getTime() - start.getTime()).toBe(6 * 60 * 60 * 1000 + 30 * 60 * 1000);
  });

  it("default memakai waktu sekarang (bukan jam server UTC)", () => {
    const start = startOfHariWIB();
    const jakartaNow = new Date(Date.now() + OFFSET_WIB_MS);
    expect(start.getUTCHours()).toBe(17); // 00:00 WIB = 17:00 UTC hari sebelumnya
    expect(start.getTime()).toBe(
      Date.UTC(
        jakartaNow.getUTCFullYear(),
        jakartaNow.getUTCMonth(),
        jakartaNow.getUTCDate(),
      ) - OFFSET_WIB_MS,
    );
  });
});

describe("alur absensi shift malam (kriteria terima F1-1)", () => {
  it("check-in 22:00 WIB lalu check-out 06:00 WIB besoknya masih dalam jendela 16 jam", () => {
    const masuk = wib("2026-10-27T22:00:00+07:00");
    const keluar = wib("2026-10-28T06:00:00+07:00"); // besoknya

    // Satu baris: check-out mencari absensi terbuka >= (keluar - 16 jam).
    const batas = batasAbsensiTerbuka(keluar);
    expect(JENDELA_ABSENSI_JAM).toBe(16);
    expect(masuk.getTime()).toBeGreaterThanOrEqual(batas.getTime());

    // Juga masih dianggap "hari ini" oleh query check-in jika dianggap perlu:
    // jendela mencakup tengah malam, jadi baris terbuka tidak terpecah.
    expect(keluar.getTime() - masuk.getTime()).toBe(8 * 60 * 60 * 1000);
  });

  it("absensi yang sudah lewat 16 jam keluar dari jendela", () => {
    const masuk = wib("2026-10-27T13:00:00+07:00");
    const keluar = wib("2026-10-28T06:00:00+07:00"); // 17 jam kemudian
    expect(masuk.getTime()).toBeLessThan(batasAbsensiTerbuka(keluar).getTime());
  });

  it("batas jendela = sekarang dikurangi 16 jam", () => {
    const now = wib("2026-10-28T06:00:00+07:00");
    expect(batasAbsensiTerbuka(now)).toEqual(
      new Date(now.getTime() - 16 * 60 * 60 * 1000),
    );
  });
});

describe("tanggalWIB & jamWIB", () => {
  it("format YYYY-MM-DD sesuai tanggal WIB", () => {
    expect(tanggalWIB(wib("2026-10-27T23:30:00+07:00"))).toBe("2026-10-27");
    // 00:30 WIB sudah berganti hari meski masih 26 Okt UTC.
    expect(tanggalWIB(wib("2026-10-28T00:30:00+07:00"))).toBe("2026-10-28");
    expect(tanggalWIB(wib("2026-10-27T23:30:00+00:00"))).toBe("2026-10-28");
  });

  it("format HH:MM jam WIB", () => {
    expect(jamWIB(wib("2026-10-27T22:00:00+07:00"))).toBe("22:00");
    expect(jamWIB(wib("2026-10-28T06:05:00+07:00"))).toBe("06:05");
    // 17:10 UTC = 00:10 WIB besoknya
    expect(jamWIB(wib("2026-10-27T17:10:00+00:00"))).toBe("00:10");
  });
});

describe("sisaMenit (pesan rate limit)", () => {
  it("membulatkan ke atas, minimum 1 menit selama belum lewat", () => {
    const mulai = wib("2026-10-27T10:00:00+07:00");
    expect(sisaMenit(mulai, 15, wib("2026-10-27T10:00:00+07:00"))).toBe(15);
    expect(sisaMenit(mulai, 15, wib("2026-10-27T10:14:01+07:00"))).toBe(1);
    expect(sisaMenit(mulai, 15, wib("2026-10-27T10:07:30+07:00"))).toBe(8);
  });

  it("0 bila jendela sudah lewat", () => {
    const mulai = wib("2026-10-27T10:00:00+07:00");
    expect(sisaMenit(mulai, 15, wib("2026-10-27T10:15:00+07:00"))).toBe(0);
    expect(sisaMenit(mulai, 15, wib("2026-10-27T11:00:00+07:00"))).toBe(0);
  });
});