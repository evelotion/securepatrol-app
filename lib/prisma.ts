import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Neon memakai sertifikat yang divalidasi oleh sistem — jaga-jaga bila CA
    // host tidak terbaca oleh node-pg (lihat catatan Prisma v7 SSL).
    ssl: process.env.NODE_ENV === "production" ? undefined : { rejectUnauthorized: false },
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
