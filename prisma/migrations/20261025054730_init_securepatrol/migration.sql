-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'CHIEF_SECURITY', 'DANRU', 'SECURITY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SECURITY',
    "regu" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL,
    "nama_titik" TEXT NOT NULL,
    "kode_barcode" TEXT NOT NULL,
    "lat" DECIMAL(10,7),
    "long" DECIMAL(10,7),
    "keterangan" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absensi" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "waktu_masuk" TIMESTAMP(3) NOT NULL,
    "waktu_keluar" TIMESTAMP(3),
    "foto_masuk" TEXT,
    "foto_keluar" TEXT,
    "lat_masuk" DECIMAL(10,7),
    "long_masuk" DECIMAL(10,7),
    "lat_keluar" DECIMAL(10,7),
    "long_keluar" DECIMAL(10,7),

    CONSTRAINT "Absensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatroliLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "foto" TEXT,
    "lat" DECIMAL(10,7),
    "long" DECIMAL(10,7),
    "status_valid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PatroliLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "aksi" TEXT NOT NULL,
    "tabel" TEXT NOT NULL,
    "data_lama" JSONB,
    "data_baru" JSONB,
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Checkpoint_kode_barcode_key" ON "Checkpoint"("kode_barcode");

-- CreateIndex
CREATE INDEX "Absensi_user_id_waktu_masuk_idx" ON "Absensi"("user_id", "waktu_masuk");

-- CreateIndex
CREATE INDEX "PatroliLog_checkpoint_id_waktu_idx" ON "PatroliLog"("checkpoint_id", "waktu");

-- CreateIndex
CREATE INDEX "PatroliLog_user_id_waktu_idx" ON "PatroliLog"("user_id", "waktu");

-- CreateIndex
CREATE INDEX "AuditLog_tabel_waktu_idx" ON "AuditLog"("tabel", "waktu");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_user_id_idx" ON "Session"("user_id");

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatroliLog" ADD CONSTRAINT "PatroliLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatroliLog" ADD CONSTRAINT "PatroliLog_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "Checkpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
