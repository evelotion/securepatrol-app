/**
 * Penyusun workbook Excel laporan (exceljs). Menerima baris yang sudah
 * diformat dari `lib/excel-baris.ts`, jadi bisa diuji tanpa database.
 */

import ExcelJS from "exceljs";

import {
  keWaktuWib,
  type BarisAbsensi,
  type BarisInsiden,
  type BarisPatroli,
  type SelStatus,
  type Tautan,
  type Warna,
} from "./excel-baris";
import type { RekapKehadiranRow, RekapPatroliRow, RingkasanLaporan } from "./rekap";

export const NAMA_APLIKASI = "SecurePatrol";
export const JUDUL_LAPORAN = "Laporan Kehadiran & Patroli";

// Token warna aplikasi (globals.css) dalam bentuk ARGB Excel.
const NAVY = "FF1E3A5F";
const PUTIH = "FFFFFFFF";
const GARIS = "FFD0D5DD";
const ZEBRA = "FFF4F7FB";
const TEKS = "FF1F2937";
const TAUTAN = "FF1D4ED8";

const WARNA: Record<Warna, { isi: string; teks: string }> = {
  ok: { isi: "FFDCFCE7", teks: "FF166534" },
  warn: { isi: "FFFEF3C7", teks: "FF92400E" },
  bad: { isi: "FFFEE2E2", teks: "FFB91C1C" },
  netral: { isi: "FFF1F5F9", teks: "FF475569" },
};

export const FORMAT_TANGGAL = "dd/mm/yyyy";
export const FORMAT_JAM = "hh:mm";
export const FORMAT_TANGGAL_JAM = "dd/mm/yyyy hh:mm";

type Tipe = "teks" | "angka" | "persen" | "tanggal" | "jam" | "tanggalJam" | "tautan" | "status" | "thumb";

export type Kolom<T> = {
  judul: string;
  kunci: keyof T & string;
  tipe?: Tipe;
  /** Lebar tetap; bila kosong dihitung dari isi. */
  lebar?: number;
  /** Jumlahkan kolom ini pada baris total. */
  total?: boolean;
};

export type OpsiWorkbook = {
  periode: { dari: string; sampai: string };
  reguLabel: string;
  dibuatOleh: string;
  dibuatPada: Date;
  totalTitikAktif: number;
  ringkasan: RingkasanLaporan;
  kehadiran: RekapKehadiranRow[];
  patroli: RekapPatroliRow[];
  absensi: BarisAbsensi[];
  patroliDetail: BarisPatroli[];
  insiden: BarisInsiden[];
  /** key Foto -> JPEG kecil; kosong = tanpa thumbnail. */
  thumbnail?: ReadonlyMap<string, Buffer>;
};

const THUMB_PX = 56;
const TINGGI_BARIS_THUMB = 44;

function tipis(): Partial<ExcelJS.Borders> {
  const sisi: Partial<ExcelJS.Border> = { style: "thin", color: { argb: GARIS } };
  return { top: sisi, left: sisi, bottom: sisi, right: sisi };
}

function formatPeriode(dari: string, sampai: string): string {
  const f = (iso: string) => iso.split("-").reverse().join("/");
  return `${f(dari)} s.d. ${f(sampai)} (WIB)`;
}

function formatWaktuDibuat(d: Date): string {
  const w = keWaktuWib(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(w.getUTCDate())}/${p(w.getUTCMonth() + 1)}/${w.getUTCFullYear()} ${p(w.getUTCHours())}:${p(w.getUTCMinutes())} WIB`;
}

/** Panjang tampilan sel (untuk lebar kolom). */
export function panjangSel(nilai: unknown): number {
  if (nilai === null || nilai === undefined) return 0;
  if (nilai instanceof Date) return 16;
  if (typeof nilai === "object") {
    const o = nilai as { teks?: string; text?: string };
    return (o.teks ?? o.text ?? "").length;
  }
  return String(nilai).length;
}

export function hitungLebar(judul: string, nilai: unknown[]): number {
  const isi = nilai.reduce<number>((m, v) => Math.max(m, panjangSel(v)), 0);
  return Math.min(48, Math.max(10, Math.max(judul.length, isi) + 3));
}

function aturCetak(sheet: ExcelJS.Worksheet, judul: string, barisJudul?: number): void {
  sheet.pageSetup = {
    paperSize: 9, // A4
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    ...(barisJudul ? { printTitlesRow: `${barisJudul}:${barisJudul}` } : {}),
  };
  sheet.headerFooter = {
    oddHeader: `&L&"-,Bold"${NAMA_APLIKASI}&C&"-,Bold"${judul}`,
    oddFooter: `&L${JUDUL_LAPORAN}&RHalaman &P dari &N`,
  };
}

function isiSel<T>(
  sel: ExcelJS.Cell,
  kolom: Kolom<T>,
  nilai: unknown,
  zebra: boolean,
): void {
  const tipe = kolom.tipe ?? "teks";
  sel.border = tipis();
  sel.font = { color: { argb: TEKS }, size: 10 };
  sel.alignment = { vertical: "middle", wrapText: tipe === "teks" };
  if (zebra) sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };

  if (nilai === null || nilai === undefined || nilai === "") {
    sel.value = "-";
    sel.alignment = { vertical: "middle", horizontal: "center" };
    sel.font = { color: { argb: "FF94A3B8" }, size: 10 };
    return;
  }

  switch (tipe) {
    case "angka":
      sel.value = nilai as number;
      sel.numFmt = "#,##0";
      sel.alignment = { vertical: "middle", horizontal: "right" };
      break;
    case "persen":
      sel.value = (nilai as number) / 100;
      sel.numFmt = "0%";
      sel.alignment = { vertical: "middle", horizontal: "right" };
      break;
    case "tanggal":
      sel.value = nilai as Date;
      sel.numFmt = FORMAT_TANGGAL;
      sel.alignment = { vertical: "middle", horizontal: "center" };
      break;
    case "jam":
      sel.value = nilai as Date;
      sel.numFmt = FORMAT_JAM;
      sel.alignment = { vertical: "middle", horizontal: "center" };
      break;
    case "tanggalJam":
      sel.value = nilai as Date;
      sel.numFmt = FORMAT_TANGGAL_JAM;
      sel.alignment = { vertical: "middle", horizontal: "center" };
      break;
    case "tautan": {
      const t = nilai as Tautan;
      sel.value = { text: t.teks, hyperlink: t.url };
      sel.font = { color: { argb: TAUTAN }, size: 10, underline: true };
      sel.alignment = { vertical: "middle", horizontal: "center" };
      break;
    }
    case "status": {
      const s = nilai as SelStatus;
      sel.value = s.teks;
      sel.font = { color: { argb: WARNA[s.warna].teks }, size: 10, bold: true };
      sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA[s.warna].isi } };
      sel.alignment = { vertical: "middle", horizontal: "center" };
      break;
    }
    case "thumb":
      // Gambar ditempel terpisah; sel hanya memegang tautan sebagai cadangan.
      sel.value = { text: (nilai as Tautan).teks, hyperlink: (nilai as Tautan).url };
      sel.font = { color: { argb: TAUTAN }, size: 10, underline: true };
      sel.alignment = { vertical: "bottom", horizontal: "center" };
      break;
    default:
      sel.value = String(nilai);
  }
}

/**
 * Tulis satu tabel: header navy, freeze, autofilter, zebra, border tipis,
 * baris total opsional, dan thumbnail (bila ada kolom `thumb` dan datanya).
 */
export function tulisTabel<T extends Record<string, unknown>>(
  wb: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  kolom: Kolom<T>[],
  rows: T[],
  opsi: { totalLabel?: string; thumbnail?: ReadonlyMap<string, Buffer>; judulCetak: string },
): void {
  const header = sheet.getRow(1);
  kolom.forEach((k, i) => {
    const sel = header.getCell(i + 1);
    sel.value = k.judul;
    sel.font = { bold: true, color: { argb: PUTIH }, size: 10 };
    sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    sel.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    sel.border = tipis();
  });
  header.height = 28;

  const adaThumb = opsi.thumbnail !== undefined && opsi.thumbnail.size > 0;

  rows.forEach((row, r) => {
    const baris = sheet.getRow(r + 2);
    kolom.forEach((k, c) => {
      isiSel(baris.getCell(c + 1), k, row[k.kunci], r % 2 === 1);
    });

    if (adaThumb) {
      kolom.forEach((k, c) => {
        if (k.tipe !== "thumb") return;
        const t = row[k.kunci] as Tautan | null | undefined;
        const gambar = t?.key ? opsi.thumbnail?.get(t.key) : undefined;
        if (!gambar) return;
        const id = wb.addImage({ buffer: gambar as unknown as ExcelJS.Buffer, extension: "jpeg" });
        sheet.addImage(id, {
          tl: { col: c + 0.1, row: r + 1 + 0.08 },
          ext: { width: THUMB_PX, height: THUMB_PX - 8 },
          editAs: "oneCell",
        });
        baris.height = TINGGI_BARIS_THUMB;
      });
    }
  });

  // Baris total.
  const kolomTotal = kolom.filter((k) => k.total);
  if (opsi.totalLabel !== undefined) {
    const nomor = rows.length + 2;
    const baris = sheet.getRow(nomor);
    kolom.forEach((k, c) => {
      const sel = baris.getCell(c + 1);
      sel.font = { bold: true, size: 10, color: { argb: TEKS } };
      sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      sel.border = tipis();
      sel.alignment = { vertical: "middle", horizontal: k.tipe === "angka" ? "right" : "left" };
    });
    baris.getCell(1).value = opsi.totalLabel;
    kolomTotal.forEach((k) => {
      const idx = kolom.indexOf(k) + 1;
      const huruf = sheet.getColumn(idx).letter;
      const sel = baris.getCell(idx);
      const hasil = rows.reduce((s, row) => s + (Number(row[k.kunci]) || 0), 0);
      sel.value = { formula: `SUM(${huruf}2:${huruf}${Math.max(rows.length + 1, 2)})`, result: hasil };
      sel.numFmt = "#,##0";
    });
  }

  kolom.forEach((k, i) => {
    sheet.getColumn(i + 1).width =
      k.lebar ??
      (k.tipe === "thumb"
        ? 11
        : hitungLebar(k.judul, rows.map((row) => row[k.kunci])));
  });

  sheet.views = [{ state: "frozen", ySplit: 1, showGridLines: false }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: kolom.length },
  };
  aturCetak(sheet, opsi.judulCetak, 1);
}

function sheetRingkasan(wb: ExcelJS.Workbook, o: OpsiWorkbook): void {
  const sheet = wb.addWorksheet("Ringkasan", {
    views: [{ showGridLines: false }],
  });
  sheet.columns = [{ width: 30 }, { width: 24 }, { width: 4 }, { width: 30 }, { width: 24 }];

  sheet.mergeCells("A1:E1");
  const judul = sheet.getCell("A1");
  judul.value = JUDUL_LAPORAN;
  judul.font = { bold: true, size: 18, color: { argb: PUTIH } };
  judul.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  judul.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(1).height = 36;

  sheet.mergeCells("A2:E2");
  const sub = sheet.getCell("A2");
  sub.value = NAMA_APLIKASI;
  sub.font = { size: 11, color: { argb: "FF475569" }, bold: true };
  sub.alignment = { horizontal: "left", indent: 1 };
  sheet.getRow(2).height = 20;

  const info: [string, string][] = [
    ["Periode", formatPeriode(o.periode.dari, o.periode.sampai)],
    ["Regu", o.reguLabel],
    ["Dibuat oleh", o.dibuatOleh],
    ["Dibuat pada", formatWaktuDibuat(o.dibuatPada)],
  ];
  info.forEach(([label, nilai], i) => {
    const r = 4 + i;
    sheet.getCell(`A${r}`).value = label;
    sheet.getCell(`A${r}`).font = { bold: true, size: 10, color: { argb: "FF475569" } };
    sheet.mergeCells(`B${r}:E${r}`);
    sheet.getCell(`B${r}`).value = nilai;
    sheet.getCell(`B${r}`).font = { size: 10, color: { argb: TEKS } };
    sheet.getCell(`B${r}`).alignment = { horizontal: "left" };
  });

  const kpiHeader = 9;
  sheet.mergeCells(`A${kpiHeader}:E${kpiHeader}`);
  const h = sheet.getCell(`A${kpiHeader}`);
  h.value = "Indikator Utama";
  h.font = { bold: true, size: 11, color: { argb: PUTIH } };
  h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  h.alignment = { horizontal: "left", indent: 1, vertical: "middle" };
  sheet.getRow(kpiHeader).height = 22;

  const r = o.ringkasan;
  const kpi: { label: string; nilai: number; format: string; warna: Warna }[] = [
    { label: "Total hadir", nilai: r.hadir, format: "#,##0", warna: "ok" },
    { label: "Telat", nilai: r.telat, format: "#,##0", warna: r.telat > 0 ? "warn" : "ok" },
    { label: "Tidak hadir", nilai: r.tidakHadir, format: "#,##0", warna: r.tidakHadir > 0 ? "bad" : "ok" },
    { label: "Titik terpatroli", nilai: r.persenTitikTerpatroli / 100, format: "0%", warna: r.persenTitikTerpatroli >= 80 ? "ok" : r.persenTitikTerpatroli >= 50 ? "warn" : "bad" },
    { label: "Scan tidak valid", nilai: r.tidakValid, format: "#,##0", warna: r.tidakValid > 0 ? "bad" : "ok" },
    { label: "Insiden", nilai: o.insiden.length, format: "#,##0", warna: o.insiden.length > 0 ? "warn" : "ok" },
  ];
  kpi.forEach((k, i) => {
    // Dua kolom KPI: kiri (A:B) dan kanan (D:E).
    const baris = kpiHeader + 1 + Math.floor(i / 2);
    const kiri = i % 2 === 0;
    const label = sheet.getCell(kiri ? `A${baris}` : `D${baris}`);
    const nilai = sheet.getCell(kiri ? `B${baris}` : `E${baris}`);
    label.value = k.label;
    label.font = { size: 10, color: { argb: TEKS } };
    label.border = tipis();
    label.alignment = { vertical: "middle", indent: 1 };
    nilai.value = k.nilai;
    nilai.numFmt = k.format;
    nilai.font = { bold: true, size: 12, color: { argb: WARNA[k.warna].teks } };
    nilai.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA[k.warna].isi } };
    nilai.border = tipis();
    nilai.alignment = { vertical: "middle", horizontal: "right" };
    sheet.getRow(baris).height = 24;
  });

  const catatan = kpiHeader + 5;
  sheet.mergeCells(`A${catatan}:E${catatan}`);
  const c = sheet.getCell(`A${catatan}`);
  c.value = `Personel dalam laporan: ${r.personel} · Total scan: ${r.scan} · Titik aktif: ${o.totalTitikAktif}. Tautan foto membutuhkan login dan hanya terbuka bagi yang berwenang.`;
  c.font = { size: 9, italic: true, color: { argb: "FF64748B" } };
  c.alignment = { wrapText: true, vertical: "top", horizontal: "left" };
  sheet.getRow(catatan).height = 30;

  aturCetak(sheet, JUDUL_LAPORAN);
}

export function bangunWorkbook(o: OpsiWorkbook): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = NAMA_APLIKASI;
  wb.title = JUDUL_LAPORAN;
  wb.created = o.dibuatPada;

  sheetRingkasan(wb, o);

  const periode = formatPeriode(o.periode.dari, o.periode.sampai);

  tulisTabel<RekapKehadiranRow & Record<string, unknown>>(
    wb,
    wb.addWorksheet("Kehadiran"),
    [
      { judul: "Nama", kunci: "nama", lebar: 26 },
      { judul: "Regu", kunci: "regu", lebar: 12 },
      { judul: "Hadir", kunci: "hadir", tipe: "angka", total: true },
      { judul: "Tepat waktu", kunci: "tepatWaktu", tipe: "angka", total: true },
      { judul: "Telat", kunci: "telat", tipe: "angka", total: true },
      { judul: "Pulang cepat", kunci: "pulangCepat", tipe: "angka", total: true },
      { judul: "Tanpa jadwal", kunci: "tanpaJadwal", tipe: "angka", total: true },
      { judul: "Tidak hadir", kunci: "tidakHadir", tipe: "angka", total: true },
    ],
    o.kehadiran.map((r) => ({ ...r, regu: r.regu ?? "-" })),
    { totalLabel: "Total", judulCetak: `Kehadiran · ${periode}` },
  );

  tulisTabel<RekapPatroliRow & Record<string, unknown>>(
    wb,
    wb.addWorksheet("Patroli"),
    [
      { judul: "Nama", kunci: "nama", lebar: 26 },
      { judul: "Regu", kunci: "regu", lebar: 12 },
      { judul: "Scan", kunci: "scan", tipe: "angka", total: true },
      { judul: "Valid", kunci: "valid", tipe: "angka", total: true },
      { judul: "Tidak valid", kunci: "tidakValid", tipe: "angka", total: true },
      { judul: "Belum terverifikasi", kunci: "belumTerverifikasi", tipe: "angka", total: true },
      { judul: "Titik unik", kunci: "titikUnik", tipe: "angka" },
      { judul: `% titik terpatroli (dari ${o.totalTitikAktif} titik)`, kunci: "persenTitik", tipe: "persen", lebar: 24 },
    ],
    o.patroli.map((r) => ({ ...r, regu: r.regu ?? "-" })),
    { totalLabel: "Total", judulCetak: `Patroli · ${periode}` },
  );

  const dgThumb = o.thumbnail !== undefined;

  tulisTabel<BarisAbsensi & Record<string, unknown>>(
    wb,
    wb.addWorksheet("Detail Absensi"),
    [
      { judul: "Tanggal", kunci: "tanggal", tipe: "tanggal", lebar: 12 },
      { judul: "Nama", kunci: "nama", lebar: 24 },
      { judul: "Regu", kunci: "regu", lebar: 10 },
      { judul: "Shift", kunci: "shift", lebar: 14 },
      { judul: "Masuk", kunci: "masuk", tipe: "jam", lebar: 9 },
      { judul: "Keluar", kunci: "keluar", tipe: "jam", lebar: 9 },
      { judul: "Status", kunci: "status", tipe: "status", lebar: 15 },
      { judul: "Lokasi masuk", kunci: "lokasiMasuk", tipe: "tautan", lebar: 22 },
      { judul: "Lokasi keluar", kunci: "lokasiKeluar", tipe: "tautan", lebar: 22 },
      { judul: "Foto masuk", kunci: "fotoMasuk", tipe: dgThumb ? "thumb" : "tautan", lebar: 12 },
      { judul: "Foto keluar", kunci: "fotoKeluar", tipe: dgThumb ? "thumb" : "tautan", lebar: 12 },
    ],
    o.absensi as (BarisAbsensi & Record<string, unknown>)[],
    {
      totalLabel: `Total ${o.absensi.length} absensi`,
      thumbnail: o.thumbnail,
      judulCetak: `Detail Absensi · ${periode}`,
    },
  );

  tulisTabel<BarisPatroli & Record<string, unknown>>(
    wb,
    wb.addWorksheet("Detail Patroli"),
    [
      { judul: "Waktu", kunci: "waktu", tipe: "tanggalJam", lebar: 17 },
      { judul: "Nama", kunci: "nama", lebar: 24 },
      { judul: "Regu", kunci: "regu", lebar: 10 },
      { judul: "Titik", kunci: "titik", lebar: 22 },
      { judul: "Status", kunci: "status", tipe: "status", lebar: 20 },
      { judul: "Jarak (m)", kunci: "jarakM", tipe: "angka", lebar: 11 },
      { judul: "Akurasi (m)", kunci: "akurasiM", tipe: "angka", lebar: 12 },
      { judul: "Alasan", kunci: "alasan", lebar: 34 },
      { judul: "Lokasi", kunci: "lokasi", tipe: "tautan", lebar: 22 },
      { judul: "Foto", kunci: "foto", tipe: dgThumb ? "thumb" : "tautan", lebar: 12 },
    ],
    o.patroliDetail as (BarisPatroli & Record<string, unknown>)[],
    {
      totalLabel: `Total ${o.patroliDetail.length} scan`,
      thumbnail: o.thumbnail,
      judulCetak: `Detail Patroli · ${periode}`,
    },
  );

  tulisTabel<BarisInsiden & Record<string, unknown>>(
    wb,
    wb.addWorksheet("Insiden"),
    [
      { judul: "Waktu", kunci: "waktu", tipe: "tanggalJam", lebar: 17 },
      { judul: "Pelapor", kunci: "pelapor", lebar: 22 },
      { judul: "Regu", kunci: "regu", lebar: 10 },
      { judul: "Titik", kunci: "titik", lebar: 18 },
      { judul: "Kategori", kunci: "kategori", lebar: 20 },
      { judul: "Prioritas", kunci: "prioritas", tipe: "status", lebar: 12 },
      { judul: "Status", kunci: "status", tipe: "status", lebar: 12 },
      { judul: "Deskripsi", kunci: "deskripsi", lebar: 44 },
      { judul: "Ditangani oleh", kunci: "ditangani", lebar: 20 },
      { judul: "Catatan", kunci: "catatan", lebar: 34 },
      { judul: "Foto", kunci: "foto", tipe: dgThumb ? "thumb" : "tautan", lebar: 12 },
    ],
    o.insiden as (BarisInsiden & Record<string, unknown>)[],
    {
      totalLabel: `Total ${o.insiden.length} insiden`,
      thumbnail: o.thumbnail,
      judulCetak: `Insiden · ${periode}`,
    },
  );

  return wb;
}
