import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  barisAbsensi,
  barisInsiden,
  barisPatroli,
  type SumberAbsensi,
} from "./excel-baris";
import {
  bangunWorkbook,
  hitungLebar,
  panjangSel,
  type OpsiWorkbook,
} from "./excel-laporan";

const ORIGIN = "https://app.example.test";
const IDS = new Map([["k1", "foto-1"]]);

const absensi: SumberAbsensi = {
  waktuMasuk: new Date("2026-11-07T23:55:00Z"),
  waktuKeluar: new Date("2026-11-08T08:00:00Z"),
  statusHadir: "TELAT",
  latMasuk: "-6.2",
  longMasuk: "106.8",
  latKeluar: null,
  longKeluar: null,
  fotoMasuk: "k1",
  fotoKeluar: null,
  user: { nama: "Budi", regu: "Regu A" },
  shift: { nama: "Pagi" },
};

function opsi(tambahan: Partial<OpsiWorkbook> = {}): OpsiWorkbook {
  return {
    periode: { dari: "2026-11-01", sampai: "2026-11-07" },
    reguLabel: "Regu A",
    dibuatOleh: "Uji Chief",
    dibuatPada: new Date("2026-11-08T03:00:00Z"),
    totalTitikAktif: 4,
    ringkasan: {
      personel: 2,
      hadir: 9,
      telat: 2,
      tidakHadir: 1,
      scan: 14,
      tidakValid: 3,
      persenTitikTerpatroli: 75,
    },
    kehadiran: [
      { id: "1", nama: "Budi", regu: "Regu A", hadir: 5, tepatWaktu: 3, telat: 2, pulangCepat: 0, tanpaJadwal: 0, tidakHadir: 0 },
      { id: "2", nama: "Sari", regu: null, hadir: 4, tepatWaktu: 4, telat: 0, pulangCepat: 0, tanpaJadwal: 0, tidakHadir: 1 },
    ],
    patroli: [
      { id: "1", nama: "Budi", regu: "Regu A", scan: 8, valid: 5, tidakValid: 3, belumTerverifikasi: 0, titikUnik: 3, persenTitik: 75 },
    ],
    absensi: barisAbsensi([absensi], ORIGIN, IDS),
    patroliDetail: barisPatroli([], ORIGIN, IDS),
    insiden: barisInsiden([], ORIGIN, IDS),
    ...tambahan,
  };
}

/** Tulis ke buffer lalu baca ulang: menguji file yang benar-benar dihasilkan. */
async function bolakBalik(o: OpsiWorkbook): Promise<ExcelJS.Workbook> {
  const buffer = await bangunWorkbook(o).xlsx.writeBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as ArrayBuffer);
  return wb;
}

describe("bangunWorkbook", () => {
  it("memuat semua sheet dengan urutan yang benar", async () => {
    const wb = await bolakBalik(opsi());
    expect(wb.worksheets.map((s) => s.name)).toEqual([
      "Ringkasan",
      "Kehadiran",
      "Patroli",
      "Detail Absensi",
      "Detail Patroli",
      "Insiden",
    ]);
  });

  it("Ringkasan: judul, periode, regu, pembuat, dan KPI", async () => {
    const wb = await bolakBalik(opsi());
    const s = wb.getWorksheet("Ringkasan")!;
    expect(s.getCell("A1").value).toBe("Laporan Kehadiran & Patroli");
    expect(s.getCell("A2").value).toBe("SecurePatrol");
    expect(s.getCell("B4").value).toBe("01/11/2026 s.d. 07/11/2026 (WIB)");
    expect(s.getCell("B5").value).toBe("Regu A");
    expect(s.getCell("B6").value).toBe("Uji Chief");
    expect(s.getCell("B7").value).toBe("08/11/2026 10:00 WIB");

    const teks: Record<string, unknown> = {};
    for (const baris of [10, 11, 12]) {
      teks[String(s.getCell(`A${baris}`).value)] = s.getCell(`B${baris}`).value;
      teks[String(s.getCell(`D${baris}`).value)] = s.getCell(`E${baris}`).value;
    }
    expect(teks).toMatchObject({
      "Total hadir": 9,
      Telat: 2,
      "Tidak hadir": 1,
      "Titik terpatroli": 0.75,
      "Scan tidak valid": 3,
      Insiden: 0,
    });
  });

  it("header navy bertulisan putih, freeze, dan autofilter", async () => {
    const wb = await bolakBalik(opsi());
    const s = wb.getWorksheet("Kehadiran")!;
    const h = s.getCell("A1");
    expect(h.value).toBe("Nama");
    expect(h.font?.color?.argb).toBe("FFFFFFFF");
    expect(h.font?.bold).toBe(true);
    expect((h.fill as ExcelJS.FillPattern).fgColor?.argb).toBe("FF1E3A5F");
    expect(s.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    // Setelah dibaca ulang exceljs mengembalikan rentang sebagai string A1.
    expect(s.autoFilter).toBe("A1:H1");
  });

  it("baris total menjumlahkan kolom angka; angka rata kanan", async () => {
    const wb = await bolakBalik(opsi());
    const s = wb.getWorksheet("Kehadiran")!;
    expect(s.getCell("A4").value).toBe("Total");
    const total = s.getCell("C4").value as { formula: string; result: number };
    expect(total.formula).toBe("SUM(C2:C3)");
    expect(total.result).toBe(9);
    expect(s.getCell("C2").alignment?.horizontal).toBe("right");
    // Regu kosong tampil '-'.
    expect(s.getCell("B3").value).toBe("-");
  });

  it("zebra: baris genap berwarna, ganjil polos", async () => {
    const wb = await bolakBalik(opsi());
    const s = wb.getWorksheet("Kehadiran")!;
    expect((s.getCell("A2").fill as ExcelJS.FillPattern | undefined)?.pattern).not.toBe("solid");
    expect((s.getCell("A3").fill as ExcelJS.FillPattern).fgColor?.argb).toBe("FFF4F7FB");
  });

  it("persen titik disimpan sebagai pecahan berformat %", async () => {
    const wb = await bolakBalik(opsi());
    const c = wb.getWorksheet("Patroli")!.getCell("H2");
    expect(c.value).toBe(0.75);
    expect(c.numFmt).toBe("0%");
  });

  it("Detail Absensi: tanggal/jam WIB, status berwarna, hyperlink lokasi & foto", async () => {
    const wb = await bolakBalik(opsi());
    const s = wb.getWorksheet("Detail Absensi")!;

    const tanggal = s.getCell("A2");
    expect(tanggal.numFmt).toBe("dd/mm/yyyy");
    expect((tanggal.value as Date).getUTCDate()).toBe(8);
    expect(s.getCell("E2").numFmt).toBe("hh:mm");
    expect((s.getCell("E2").value as Date).getUTCHours()).toBe(6);

    const status = s.getCell("G2");
    expect(status.value).toBe("Telat");
    expect((status.fill as ExcelJS.FillPattern).fgColor?.argb).toBe("FFFEF3C7");

    const lokasi = s.getCell("H2").value as ExcelJS.CellHyperlinkValue;
    expect(lokasi.hyperlink).toBe("https://www.google.com/maps?q=-6.2,106.8");
    const foto = s.getCell("J2").value as ExcelJS.CellHyperlinkValue;
    expect(foto.text).toBe("Lihat foto");
    expect(foto.hyperlink).toBe(`${ORIGIN}/api/foto/foto-1`);
    // Foto keluar tidak ada -> '-'.
    expect(s.getCell("K2").value).toBe("-");

    expect(s.getCell("A3").value).toBe("Total 1 absensi");
  });

  it("A4 landscape, fit to width, judul berulang, header & footer halaman", async () => {
    const wb = await bolakBalik(opsi());
    for (const s of wb.worksheets) {
      expect(s.pageSetup.paperSize).toBe(9);
      expect(s.pageSetup.orientation).toBe("landscape");
      expect(s.pageSetup.fitToPage).toBe(true);
      expect(s.pageSetup.fitToWidth).toBe(1);
      expect(s.headerFooter.oddFooter).toContain("Halaman &P dari &N");
      expect(s.headerFooter.oddHeader).toContain("SecurePatrol");
    }
    expect(wb.getWorksheet("Detail Absensi")!.pageSetup.printTitlesRow).toBe("1:1");
  });

  it("tanpa thumbnail tidak ada gambar tertanam", async () => {
    const wb = await bolakBalik(opsi());
    expect(wb.getWorksheet("Detail Absensi")!.getImages()).toHaveLength(0);
  });

  it("dengan thumbnail: gambar tertanam di baris yang punya foto", async () => {
    // JPEG 1x1 valid.
    const jpeg = Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      "base64",
    );
    const wb = await bolakBalik(opsi({ thumbnail: new Map([["k1", jpeg]]) }));
    const s = wb.getWorksheet("Detail Absensi")!;
    expect(s.getImages()).toHaveLength(1);
    // Sel foto tetap berisi tautan sebagai cadangan.
    expect((s.getCell("J2").value as ExcelJS.CellHyperlinkValue).hyperlink).toBe(
      `${ORIGIN}/api/foto/foto-1`,
    );
  });
});

describe("lebar kolom", () => {
  it("panjangSel menangani teks, tautan, tanggal, dan kosong", () => {
    expect(panjangSel("abc")).toBe(3);
    expect(panjangSel({ teks: "Lihat foto" })).toBe(10);
    expect(panjangSel(new Date())).toBe(16);
    expect(panjangSel(null)).toBe(0);
  });

  it("hitungLebar dibatasi 10..48", () => {
    expect(hitungLebar("A", ["b"])).toBe(10);
    expect(hitungLebar("Nama", ["x".repeat(100)])).toBe(48);
    expect(hitungLebar("Nama", ["Budi Santoso"])).toBe(15);
  });
});
