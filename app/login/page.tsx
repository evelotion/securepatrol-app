import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Masuk",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-2xl font-bold text-white shadow-lg shadow-indigo-500/30">
            SP
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            SecurePatrol
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Absensi & patroli sekuriti gedung
          </p>
        </header>

        <section className="glass-strong rounded-3xl p-6 sm:p-7">
          <h2 className="section-title">Masuk ke akun Anda</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Gunakan email atau username yang terdaftar.
          </p>
          <LoginForm />
        </section>

        <p className="mt-6 text-center text-xs text-slate-500">
          Butuh akses? Hubungi Super Admin gedung Anda.
        </p>
      </div>
    </main>
  );
}
