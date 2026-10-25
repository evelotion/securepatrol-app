import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { getPatroliSaya } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

import { PatroliClient } from "./patroli-client";

export const metadata = { title: "Patroli" };

export default function PatroliPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      }
    >
      <PatroliSection />
    </Suspense>
  );
}

async function PatroliSection() {
  const { actor, data } = await getPatroliSaya();
  const hariIni = new Date();
  const total = data.checkpoints.length;
  const dikunjungi = data.checkpoints.filter((cp) => cp.dikunjungi).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Scan Titik Patroli</h1>
          <p className="page-sub mt-1">
            {formatTanggal(hariIni)} · {actor.nama}
            {actor.regu ? ` · ${actor.regu}` : ""}
          </p>
        </div>
        <span
          className={`badge ${
            dikunjungi === total && total > 0 ? "badge-green" : "badge-amber"
          }`}
        >
          {dikunjungi}/{total} titik dipatroli
        </span>
      </header>

      <PatroliClient checkpoints={data.checkpoints} logs={data.logs} />
    </div>
  );
}
