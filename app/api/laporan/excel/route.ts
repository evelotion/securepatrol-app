import { NextResponse } from "next/server";

import { writeAudit } from "@/lib/audit";
import { bacaFilterLaporan, getLaporan } from "@/lib/data-laporan";
import { ambilThumbnail, getDetailExport } from "@/lib/data-laporan-export";
import { thumbnailDiizinkan } from "@/lib/excel-baris";
import { bangunWorkbook } from "@/lib/excel-laporan";

/**
 * Export rekap + detail ke Excel. Role & cakupan dicek lewat `getLaporan`
 * (redirect bila belum login / bukan manager), jadi Danru tetap hanya
 * mendapat regunya. Thumbnail (`foto=1`) hanya untuk rentang ≤ 7 hari.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const filter = bacaFilterLaporan(url.searchParams);
  const laporan = await getLaporan(filter);

  const detail = await getDetailExport(laporan, url.origin);

  const mintaThumbnail =
    url.searchParams.get("foto") === "1" &&
    thumbnailDiizinkan(filter.dari, filter.sampai);
  const thumbnail = mintaThumbnail ? await ambilThumbnail(detail) : undefined;

  const { actor } = laporan;
  const reguLabel =
    filter.regu ||
    (actor.role === "DANRU" && actor.regu ? actor.regu : "Semua regu");

  const dibuatPada = new Date();
  const wb = bangunWorkbook({
    periode: { dari: filter.dari, sampai: filter.sampai },
    reguLabel,
    dibuatOleh: actor.nama,
    dibuatPada,
    totalTitikAktif: laporan.totalTitikAktif,
    ringkasan: laporan.ringkasan,
    kehadiran: laporan.kehadiran,
    patroli: laporan.patroli,
    absensi: detail.absensi,
    patroliDetail: detail.patroli,
    insiden: detail.insiden,
    thumbnail,
  });

  const buffer = await wb.xlsx.writeBuffer();

  await writeAudit({
    userId: actor.id,
    aksi: "EXPORT_LAPORAN",
    tabel: "Laporan",
    dataBaru: {
      dari: filter.dari,
      sampai: filter.sampai,
      regu: filter.regu || null,
      userId: filter.userId || null,
      baris: laporan.kehadiran.length,
      absensi: detail.absensi.length,
      patroli: detail.patroli.length,
      insiden: detail.insiden.length,
      thumbnail: thumbnail ? thumbnail.size : 0,
    },
  });

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rekap-${filter.dari}_${filter.sampai}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
