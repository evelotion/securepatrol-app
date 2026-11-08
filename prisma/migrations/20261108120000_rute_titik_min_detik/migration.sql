-- Anti titik palsu: waktu tempuh minimum antar titik dalam satu putaran.
-- AlterTable
ALTER TABLE "RuteTitik" ADD COLUMN     "min_detik_dari_sebelumnya" INTEGER NOT NULL DEFAULT 60;
