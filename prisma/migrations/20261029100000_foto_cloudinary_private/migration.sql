-- F4-1: Foto menyimpan metadata dan Cloudinary public ID, bukan isi foto.
CREATE TABLE "Foto" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "ukuran" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Foto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Foto_key_key" ON "Foto"("key");
CREATE INDEX "Foto_user_id_dibuat_pada_idx" ON "Foto"("user_id", "dibuat_pada");

ALTER TABLE "Foto"
  ADD CONSTRAINT "Foto_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
