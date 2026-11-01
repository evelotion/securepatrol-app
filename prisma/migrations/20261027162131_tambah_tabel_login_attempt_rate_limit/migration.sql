-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "sukses" BOOLEAN NOT NULL DEFAULT false,
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_identifier_sukses_waktu_idx" ON "LoginAttempt"("identifier", "sukses", "waktu");

-- CreateIndex
CREATE INDEX "LoginAttempt_ip_sukses_waktu_idx" ON "LoginAttempt"("ip", "sukses", "waktu");

-- F1-4: Partial unique index ditulis manual (Prisma tidak mendukung indeks
-- parsial di schema). Satu user hanya boleh punya satu absensi terbuka
-- (waktu_keluar NULL) — mencegah double tap membuat dua baris.
CREATE UNIQUE INDEX "absensi_satu_terbuka"
    ON "Absensi"("user_id") WHERE "waktu_keluar" IS NULL;
