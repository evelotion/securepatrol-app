import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { writeAudit } from "@/lib/audit";
import { bacaFilterLaporan, getLaporan } from "@/lib/data-laporan";

const LEBAR_KOLOM = 14;

function gayaHeader(sheet: ExcelJS.Worksheet): void {
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle", wrapText: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

/**
 * Export rekap ke Excel. Role & cakupan dicek lewat `getLaporan` (redirect bila
 * belum login / bukan manager), jadi Danru tetap hanya mendapat regunya.
 */
export async function GET(request: Request) {
  const filter = bacaFilterLaporan(new URL(request.url).searchParams);
  const laporan = await getLaporan(filter);

  const wb = new ExcelJS.Workbook();
  wb.creator = "SecurePatrol";
  wb.created = new Date();

  const hadir = wb.addWorksheet("Kehadiran");
  hadir.columns = [
    { header: "Nama", key: "nama", width: 26 },
    { header: "Regu", key: "regu", width: LEBAR_KOLOM },
    { header: "Hadir", key: "hadir", width: 10 },
    { header: "Tepat waktu", key: "tepatWaktu", width: LEBAR_KOLOM },
    { header: "Telat", key: "telat", width: 10 },
    { header: "Pulang cepat", key: "pulangCepat", width: LEBAR_KOLOM },
    { header: "Tanpa jadwal", key: "tanpaJadwal", width: LEBAR_KOLOM },
    { header: "Tidak hadir", key: "tidakHadir", width: LEBAR_KOLOM },
  ];
  for (const r of laporan.kehadiran) {
    hadir.addRow({ ...r, regu: r.regu ?? "-" });
  }
  gayaHeader(hadir);

  const patroli = wb.addWorksheet("Patroli");
  patroli.columns = [
    { header: "Nama", key: "nama", width: 26 },
    { header: "Regu", key: "regu", width: LEBAR_KOLOM },
    { header: "Scan", key: "scan", width: 10 },
    { header: "Valid", key: "valid", width: 10 },
    { header: "Tidak valid", key: "tidakValid", width: LEBAR_KOLOM },
    { header: "Belum terverifikasi", key: "belumTerverifikasi", width: 20 },
    { header: "Titik unik", key: "titikUnik", width: LEBAR_KOLOM },
    {
      header: `% titik terpatroli (dari ${laporan.totalTitikAktif} titik)`,
      key: "persenTitik",
      width: 26,
    },
  ];
  for (const r of laporan.patroli) {
    patroli.addRow({ ...r, regu: r.regu ?? "-" });
  }
  gayaHeader(patroli);

  const info = wb.addWorksheet("Info");
  info.addRows([
    ["Periode", `${filter.dari} s.d. ${filter.sampai} (WIB)`],
    ["Regu", filter.regu || "Semua dalam cakupan"],
    ["Dibuat oleh", laporan.actor.nama],
    ["Dibuat pada", new Date().toISOString()],
  ]);
  info.getColumn(1).font = { bold: true };
  info.getColumn(1).width = 16;
  info.getColumn(2).width = 40;

  const buffer = await wb.xlsx.writeBuffer();

  await writeAudit({
    userId: laporan.actor.id,
    aksi: "EXPORT_LAPORAN",
    tabel: "Laporan",
    dataBaru: {
      dari: filter.dari,
      sampai: filter.sampai,
      regu: filter.regu || null,
      userId: filter.userId || null,
      baris: laporan.kehadiran.length,
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
