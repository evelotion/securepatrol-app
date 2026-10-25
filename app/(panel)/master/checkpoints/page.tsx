import { Suspense } from "react";

import { listCheckpoints } from "@/lib/data";

import { CheckpointsClient } from "./checkpoints-client";

export const metadata = { title: "Master Checkpoint" };

export default function MasterCheckpointsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <div className="skeleton h-20 w-full rounded-3xl" />
          <div className="skeleton h-72 w-full rounded-3xl" />
        </div>
      }
    >
      <CheckpointsSection />
    </Suspense>
  );
}

async function CheckpointsSection() {
  const checkpoints = await listCheckpoints();

  return (
    <div className="flex flex-col gap-5">
      <header className="glass rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="page-title">Master Checkpoint</h1>
            <p className="page-sub mt-1">
              Titik patroli beserta kode barcode untuk dicetak & ditempel
              di gedung.
            </p>
          </div>
          <span className="badge badge-slate">{checkpoints.length} titik</span>
        </div>
      </header>

      <CheckpointsClient checkpoints={checkpoints} />
    </div>
  );
}
