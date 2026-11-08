-- Anti titik palsu: radius validasi GPS per checkpoint (NULL = PATROL_RADIUS_M).
-- AlterTable
ALTER TABLE "Checkpoint" ADD COLUMN     "radius_m" INTEGER;
