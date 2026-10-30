import { WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Halaman fallback ketika pengguna offline (dirujuk service worker). */
export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
      <Card className="w-full max-w-sm p-6">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <WifiOff className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-3 text-lg font-semibold text-foreground">
          Anda sedang offline
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Koneksi internet terputus. Silakan coba lagi setelah jaringan pulih.
        </p>
        <Button asChild className="mt-5 w-full">
          <a href="/dashboard">Coba lagi</a>
        </Button>
      </Card>
    </main>
  );
}
