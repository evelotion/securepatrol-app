import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/master",
  "/beranda",
  "/absensi",
  "/patroli",
  "/insiden",
  "/profil",
];
const AUTH_ROUTES = ["/login"];
const SESSION_COOKIE = "sp_session";

/**
 * Prisma khusus proxy (instance terpisah dari `lib/prisma`).
 * Proxy berjalan di Node.js runtime pada Next 16.
 */
let proxyPrisma: PrismaClient | undefined;
function getPrisma(): PrismaClient {
  if (!proxyPrisma) {
    proxyPrisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }
  return proxyPrisma;
}

/**
 * Penjaga rute & role (Blok 2) — berjalan sebelum halaman dirender.
 *
 * - Belum login / sesi tidak valid  -> /login
 * - Sudah login                     -> tidak boleh membuka /login
 * - `/master/*` hanya SUPER_ADMIN   -> selain itu ke /dashboard
 * - `/`                             -> diarahkan sesuai status login
 *
 * Validasi ulang tetap dilakukan di Server Component & Server Action
 * (`lib/auth.ts`), proxy hanya lapisan pertahanan pertama.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isMaster = pathname === "/master" || pathname.startsWith("/master/");

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(token ? "/dashboard" : "/login", request.url),
    );
  }

  if (isAuthRoute) {
    return token
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next();
  }

  if (!isProtected) return NextResponse.next();
  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  // Rute butuh role: cek sesi + role di database (hanya untuk /master/*).
  if (isMaster) {
    try {
      const session = await getPrisma().session.findUnique({
        where: { token },
        include: { user: { select: { role: true, aktif: true } } },
      });

      if (!session || session.expiresAt.getTime() < Date.now()) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      if (!session.user.aktif) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      if (session.user.role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch (err) {
      // DB tidak terjangkau: biarkan pengecekan di Server Component yang jalan.
      console.error(
        "[proxy] role check gagal:",
        process.env.DATABASE_URL ? "DATABASE_URL ada" : "DATABASE_URL KOSONG",
        err instanceof Error ? err.message : err,
      );
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next/favicon|icons|favicon\\.ico|sw\\.js|manifest\\.webmanifest|robots\\.txt).*)",
  ],
};
