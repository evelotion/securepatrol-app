import type { Metadata } from "next";

import { ShieldCheck } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Masuk",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-3 top-3">
        <ThemeToggle className="size-12" />
      </div>

      <div className="w-full max-w-sm">
        <header className="mb-7 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-[var(--radius)] bg-primary text-primary-foreground">
            <ShieldCheck className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            SecurePatrol
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manajemen keamanan gedung
          </p>
        </header>

        <section className="rounded-[var(--radius)] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:p-6">
          <h2 className="section-title">Masuk ke akun Anda</h2>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">
            Gunakan email atau username yang terdaftar.
          </p>
          <LoginForm />
        </section>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Butuh akses? Hubungi Super Admin gedung Anda.
        </p>
      </div>
    </main>
  );
}
