import Link from "next/link";

/**
 * Halaman akar. `proxy.ts` selalu me-redirect `/` ke /login atau /dashboard
 * sebelum halaman dirender, jadi ini hanya fallback statis.
 */
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="glass rounded-3xl p-8">
        <h1 className="page-title">SecurePatrol</h1>
        <p className="page-sub mt-2">
          Absensi & patroli sekuriti berbasis QR & GPS.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="btn btn-primary btn-sm">
            Masuk
          </Link>
          <Link href="/dashboard" className="btn btn-ghost btn-sm">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
