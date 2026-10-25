import "dotenv/config";

import { defineConfig, env } from "prisma/config";

/**
 * Prisma Config (Prisma 7) — sumber konfigurasi CLI & koneksi database.
 * Env tidak lagi dimuat otomatis, jadi `dotenv/config` diimpor di sini.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
