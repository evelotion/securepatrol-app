import Link from "next/link";

import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Halaman akar. `proxy.ts` selalu me-redirect `/` ke /login atau /dashboard
 * sebelum halaman dirender, jadi ini hanya fallback statis.
 */
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
      <Card className="w-full max-w-sm p-6">
        <span className="mx-auto flex size-14 items-center justify-center rounded-[var(--radius)] bg-primary text-primary-foreground">
          <ShieldCheck className="size-7" aria-hidden="true" />
        </span>
        <h1 className="page-title mt-4">SecurePatrol</h1>
        <p className="page-sub mt-1">
          Absensi & patroli sekuriti berbasis QR & GPS.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/login">Masuk</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
