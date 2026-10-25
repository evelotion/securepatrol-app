import { Suspense } from "react";

import { getPatroliSaya } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

import { PatroliClient } from "./patroli-client";

export const metadata = { title: "Patroli" };

export default function PatroliPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <div className="skeleton h-24 w-full rounded-2xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="skeleton h-96 w-full rounded-2xl" />
            <div className="skeleton h-96 w-full rounded-2xl" />
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
    <div className="flex flex-col gap-5">
      <header className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
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
        </div>
      </header>

      <PatroliClient checkpoints={data.checkpoints} logs={data.logs} />
    </div>
  );
}
