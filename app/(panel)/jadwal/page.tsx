import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { getJadwalPekan } from "@/lib/data-jadwal";

import { JadwalClient } from "./jadwal-client";

export const metadata = { title: "Jadwal Jaga" };

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** searchParams dibaca di dalam <Suspense> supaya rute tetap bisa diprerender. */
export default function JadwalPage({ searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-96 rounded-[var(--radius)]" />
        </div>
      }
    >
      <JadwalSection searchParams={searchParams} />
    </Suspense>
  );
}

async function JadwalSection({
  searchParams,
}: {
  searchParams: PageProps["searchParams"];
}) {
  const params = await searchParams;
  const pekan = typeof params.pekan === "string" ? params.pekan : undefined;
  const { data } = await getJadwalPekan(pekan);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Jadwal jaga</p>
          <h1 className="page-title mt-1">Jadwal Mingguan</h1>
          <p className="page-sub mt-0.5">
            {data.reguScope
              ? `Regu ${data.reguScope} — hanya anggota regu Anda yang bisa diatur.`
              : "Semua regu. Klik satu sel untuk mengatur shift."}
          </p>
        </div>
        <span className="badge badge-slate">{data.users.length} personel</span>
      </header>

      <JadwalClient data={data} />
    </div>
  );
}
