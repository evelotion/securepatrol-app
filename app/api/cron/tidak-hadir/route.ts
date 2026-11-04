import { NextResponse } from "next/server";

import { tanggalPenilaian } from "@/lib/kehadiran";
import { tandaiTidakHadir } from "@/lib/tidak-hadir";

/**
 * Cron harian (F4-2): tandai staf yang punya jadwal pada dua tanggal terakhir
 * (kemarin & kemarin lusa) tetapi tidak absen.
 *
 * Dua tanggal dipakai karena shift malam 22:00 → 06:00 tanggal D baru selesai
 * pada D+1, sehingga cron 00:10 WIB di D+1 belum boleh menilainya. Pada cron
 * D+2, jadwal D masuk sebagai "kemarin lusa" dan tetap tertandai. Pemanggilan
 * ulang idempoten — lihat `tandaiTidakHadir`.
 *
 * Dilindungi `CRON_SECRET` — tanpa secret, endpoint menolak semua permintaan.
 * Jadwal Vercel: 17:10 UTC = 00:10 WIB.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET belum di-set di environment." },
      { status: 500 },
    );
  }

  const otorisasi = request.headers.get("authorization");
  if (otorisasi !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Tidak berwenang." }, { status: 401 });
  }

  const hasil = [];
  for (const tanggal of tanggalPenilaian(new Date())) {
    hasil.push({ tanggal, ...(await tandaiTidakHadir(tanggal)) });
  }

  return NextResponse.json({
    tanggal: hasil.map((baris) => baris.tanggal),
    diperiksa: hasil.reduce((total, baris) => total + baris.diperiksa, 0),
    ditandai: hasil.reduce((total, baris) => total + baris.ditandai, 0),
    hasil,
  });
}
