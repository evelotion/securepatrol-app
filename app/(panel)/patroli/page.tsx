import { Suspense } from "react";

import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { getPatroliSaya } from "@/lib/data";
import { formatTanggal } from "@/lib/format";
import { startOfHariWIB } from "@/lib/waktu";

import { PatroliClient } from "./patroli-client";

export const metadata = { title: "Patroli" };

export default function PatroliPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-96 rounded-[var(--radius)]" />
          <Skeleton className="h-64 rounded-[var(--radius)]" />
        </div>
      }
    >
      <PatroliSection />
    </Suspense>
  );
}

async function PatroliSection() {
  const { actor, data } = await getPatroliSaya();

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start gap-1">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0"
          aria-label="Kembali ke Beranda"
        >
          <Link href="/beranda">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="page-title">Patroli</h1>
          <p className="page-sub mt-0.5 truncate">
            {formatTanggal(startOfHariWIB())} · {actor.nama}
            {actor.regu ? ` · ${actor.regu}` : ""}
          </p>
        </div>
      </header>

      <PatroliClient
        checkpoints={data.checkpoints}
        logs={data.logs}
        actorName={actor.nama}
      />
    </div>
  );
}
