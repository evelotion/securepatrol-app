-- F4-2: status kehadiran terhadap jadwal shift.
CREATE TYPE "StatusHadir" AS ENUM ('TEPAT_WAKTU', 'TELAT', 'PULANG_CEPAT', 'TIDAK_HADIR');

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jam_mulai" TEXT NOT NULL,
    "jam_selesai" TEXT NOT NULL,
    "toleransi_telat_menit" INTEGER NOT NULL DEFAULT 15,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jadwal" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Jadwal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rute" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "shift_id" TEXT,
    "target_putaran" INTEGER NOT NULL DEFAULT 1,
    "interval_menit" INTEGER NOT NULL DEFAULT 120,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuteTitik" (
    "id" TEXT NOT NULL,
    "rute_id" TEXT NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,

    CONSTRAINT "RuteTitik_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Absensi" ADD COLUMN "shift_id" TEXT,
ADD COLUMN "status_hadir" "StatusHadir";

-- CreateIndex
CREATE UNIQUE INDEX "Shift_nama_key" ON "Shift"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Jadwal_user_id_tanggal_key" ON "Jadwal"("user_id", "tanggal");

-- CreateIndex
CREATE INDEX "Jadwal_tanggal_shift_id_idx" ON "Jadwal"("tanggal", "shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "Rute_nama_key" ON "Rute"("nama");

-- CreateIndex
CREATE INDEX "Rute_shift_id_idx" ON "Rute"("shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "RuteTitik_rute_id_checkpoint_id_key" ON "RuteTitik"("rute_id", "checkpoint_id");

-- CreateIndex
CREATE UNIQUE INDEX "RuteTitik_rute_id_urutan_key" ON "RuteTitik"("rute_id", "urutan");

-- AddForeignKey
ALTER TABLE "Jadwal" ADD CONSTRAINT "Jadwal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jadwal" ADD CONSTRAINT "Jadwal_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rute" ADD CONSTRAINT "Rute_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuteTitik" ADD CONSTRAINT "RuteTitik_rute_id_fkey" FOREIGN KEY ("rute_id") REFERENCES "Rute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuteTitik" ADD CONSTRAINT "RuteTitik_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "Checkpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
