import { Suspense } from "react";

import Link from "next/link";

import { ArrowLeft, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { requireRole } from "@/lib/auth";
import { FIELD_ROLES } from "@/lib/roles";

export const metadata = { title: "Insiden" };

/** Placeholder tab — fitur laporan insiden dikerjakan di PR F4-4. */
export default function InsidenPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-56 rounded-[var(--radius)]" />
        </div>
      }
    >
      <InsidenSection />
    </Suspense>
  );
}

async function InsidenSection() {
  await requireRole(FIELD_ROLES);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">Segera hadir</p>
        <h1 className="page-title mt-1">Insiden</h1>
      </header>

      <Card className="p-5">
        <span className="flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--status-warn)_16%,transparent)] text-[var(--status-warn-text)]">
          <TriangleAlert className="size-6" aria-hidden="true" />
        </span>
        <h2 className="section-title mt-4">Pelaporan insiden belum aktif</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Foto, kategori, prioritas, dan tindak lanjut insiden akan tersedia
          pada rilis berikutnya. Sementara itu, laporkan kejadian lewat Danru
          atau radio regu.
        </p>
        <Button asChild variant="outline" className="mt-5 w-full">
          <Link href="/beranda">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali ke Beranda
          </Link>
        </Button>
      </Card>
    </div>
  );
}
