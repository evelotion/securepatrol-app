/*
  Warnings:

  - You are about to drop the column `status_valid` on the `PatroliLog` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StatusScan" AS ENUM ('VALID', 'TIDAK_VALID', 'BELUM_TERVERIFIKASI');

-- Tambah status baru nullable dahulu, lalu migrasikan nilai boolean lama.
ALTER TABLE "PatroliLog" ADD COLUMN "status" "StatusScan";
UPDATE "PatroliLog" SET "status" = CASE
  WHEN "status_valid" THEN 'VALID'::"StatusScan"
  ELSE 'TIDAK_VALID'::"StatusScan"
END;

-- Tambah metadata validasi, tetapkan default dan hilangkan kolom boolean lama.
ALTER TABLE "PatroliLog"
  ADD COLUMN "akurasi_m" INTEGER,
  ADD COLUMN "jarak_m" INTEGER,
  ADD COLUMN "alasan" TEXT,
  ALTER COLUMN "status" SET DEFAULT 'VALID',
  ALTER COLUMN "status" SET NOT NULL,
  DROP COLUMN "status_valid";
