import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { listShifts } from "@/lib/data-jadwal";

import { ShiftsClient } from "./shifts-client";

export const metadata = { title: "Master Shift" };

export default function MasterShiftsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-72 rounded-[var(--radius)]" />
        </div>
      }
    >
      <ShiftsSection />
    </Suspense>
  );
}

async function ShiftsSection() {
  const shifts = await listShifts();

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Master data</p>
          <h1 className="page-title mt-1">Master Shift</h1>
          <p className="page-sub mt-0.5">
            Jam shift dipakai untuk menilai TEPAT_WAKTU, TELAT, dan PULANG_CEPAT.
          </p>
        </div>
        <span className="badge badge-slate">{shifts.length} shift</span>
      </header>

      <ShiftsClient shifts={shifts} />
    </div>
  );
}
