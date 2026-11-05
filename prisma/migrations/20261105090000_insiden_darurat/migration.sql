-- CreateEnum
CREATE TYPE "KategoriInsiden" AS ENUM ('KERUSAKAN', 'TAMU_MENCURIGAKAN', 'KEBAKARAN_ASAP', 'KEHILANGAN', 'LAINNYA');

-- CreateEnum
CREATE TYPE "PrioritasInsiden" AS ENUM ('RENDAH', 'SEDANG', 'TINGGI', 'DARURAT');

-- CreateEnum
CREATE TYPE "StatusInsiden" AS ENUM ('BARU', 'DITANGANI', 'SELESAI');

-- CreateTable
CREATE TABLE "Insiden" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kategori" "KategoriInsiden" NOT NULL,
    "prioritas" "PrioritasInsiden" NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "foto_keys" TEXT[],
    "lat" DECIMAL(10,7),
    "long" DECIMAL(10,7),
    "akurasi_m" INTEGER,
    "checkpoint_id" TEXT,
    "status" "StatusInsiden" NOT NULL DEFAULT 'BARU',
    "ditangani_oleh" TEXT,
    "ditangani_pada" TIMESTAMP(3),
    "catatan_tindak_lanjut" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insiden_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Insiden_status_prioritas_created_at_idx" ON "Insiden"("status", "prioritas", "created_at");

-- CreateIndex
CREATE INDEX "Insiden_user_id_created_at_idx" ON "Insiden"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "Insiden" ADD CONSTRAINT "Insiden_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insiden" ADD CONSTRAINT "Insiden_ditangani_oleh_fkey" FOREIGN KEY ("ditangani_oleh") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insiden" ADD CONSTRAINT "Insiden_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "Checkpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

