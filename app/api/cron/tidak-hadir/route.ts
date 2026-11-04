import { NextResponse } from "next/server";

import { tambahHari } from "@/lib/shift";
import { tandaiTidakHadir } from "@/lib/tidak-hadir";
import { tanggalWIB } from "@/lib/waktu";

/**
 * Cron harian (F4-2): tandai staf yang punya jadwal kemarin tetapi tidak absen.
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

  const tanggal = tambahHari(tanggalWIB(), -1);
  const hasil = await tandaiTidakHadir(tanggal);

  return NextResponse.json({ tanggal, ...hasil });
}
