import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { listCheckpoints } from "@/lib/data";

import { CheckpointsClient } from "./checkpoints-client";

export const metadata = { title: "Master Checkpoint" };

export default function MasterCheckpointsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-72 rounded-xl" />
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Master Checkpoint</h1>
          <p className="page-sub mt-1">
            Titik patroli beserta kode barcode untuk dicetak & ditempel di
            gedung.
          </p>
        </div>
        <span className="badge badge-slate">{checkpoints.length} titik</span>
      </header>

      <CheckpointsClient checkpoints={checkpoints} />
    </div>
  );
}
