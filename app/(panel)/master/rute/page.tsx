import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import {
  listCheckpointPilihan,
  listRute,
  listShifts,
} from "@/lib/data-jadwal";

import { RuteClient } from "./rute-client";

export const metadata = { title: "Master Rute" };

export default function MasterRutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-96 rounded-[var(--radius)]" />
        </div>
      }
    >
      <RuteSection />
    </Suspense>
  );
}

async function RuteSection() {
  const [rute, shifts, checkpoints] = await Promise.all([
    listRute(),
    listShifts(),
    listCheckpointPilihan(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Master data</p>
          <h1 className="page-title mt-1">Master Rute</h1>
          <p className="page-sub mt-0.5">
            Rute menentukan urutan titik dan target putaran per shift.
          </p>
        </div>
        <span className="badge badge-slate">{rute.length} rute</span>
      </header>

      <RuteClient
        rute={rute}
        shifts={shifts.filter((s) => s.aktif)}
        checkpoints={checkpoints}
      />
    </div>
  );
}
