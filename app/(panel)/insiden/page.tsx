import { Suspense } from "react";

import Link from "next/link";

import { AutoRefresh } from "@/components/auto-refresh";
import { InsidenKartu } from "@/components/insiden-kartu";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getCurrentUser } from "@/lib/auth";
import { getInsidenSaya, getInsidenTim } from "@/lib/data-insiden";
import {
  isStatus,
  STATUS_INSIDEN,
  STATUS_LABEL,
  type StatusInsiden,
} from "@/lib/insiden";
import { isManager } from "@/lib/roles";

import { InsidenForm } from "./insiden-form";

export const metadata = { title: "Insiden" };

type SearchParams = Promise<{ titik?: string; status?: string }>;

export default function InsidenPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-56 rounded-[var(--radius)]" />
        </div>
      }
    >
      <InsidenSection searchParams={searchParams} />
    </Suspense>
  );
}

async function InsidenSection({ searchParams }: { searchParams: SearchParams }) {
  const [actor, params] = await Promise.all([getCurrentUser(), searchParams]);

  if (isManager(actor.role)) {
    const filter: StatusInsiden | undefined =
      params.status && isStatus(params.status) ? params.status : undefined;
    return <DaftarManager filter={filter} />;
  }

  return <HalamanStaf titikAwal={params.titik ?? ""} />;
}

async function HalamanStaf({ titikAwal }: { titikAwal: string }) {
  const { actor, insiden, checkpoints } = await getInsidenSaya();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">Laporan lapangan</p>
        <h1 className="page-title mt-1">Insiden</h1>
        <p className="page-sub mt-0.5">
          Laporkan kerusakan, tamu mencurigakan, asap, atau kehilangan.
        </p>
      </header>

      <Card className="p-4">
        <InsidenForm
          checkpoints={checkpoints}
          titikAwal={titikAwal}
          actorName={actor.nama}
        />
      </Card>

      <section aria-label="Laporan saya" className="flex flex-col gap-3">
        <h2 className="section-title">Laporan saya</h2>
        {insiden.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada laporan insiden.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {insiden.map((item) => (
              <InsidenKartu
                key={item.id}
                item={item}
                bolehKelola={false}
                tampilPelapor={false}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function DaftarManager({ filter }: { filter: StatusInsiden | undefined }) {
  const { actor, insiden } = await getInsidenTim(filter);

  return (
    <div className="flex flex-col gap-4">
      {/* Daftar insiden ikut segar tiap 15 detik, sama seperti dashboard. */}
      <AutoRefresh intervalMs={15_000} />

      <header>
        <p className="eyebrow">
          {actor.role === "DANRU" && actor.regu ? actor.regu : "Semua regu"}
        </p>
        <h1 className="page-title mt-1">Insiden</h1>
        <p className="page-sub mt-0.5">
          Pantau laporan dan tindak lanjutnya.
        </p>
      </header>

      <nav aria-label="Filter status" className="flex flex-wrap gap-2">
        <FilterLink href="/insiden" aktif={!filter} label="Semua" />
        {STATUS_INSIDEN.map((s) => (
          <FilterLink
            key={s}
            href={`/insiden?status=${s}`}
            aktif={filter === s}
            label={STATUS_LABEL[s]}
          />
        ))}
      </nav>

      {insiden.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tidak ada insiden untuk filter ini.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {insiden.map((item) => (
            <InsidenKartu
              key={item.id}
              item={item}
              bolehKelola
              tampilPelapor
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterLink({
  href,
  aktif,
  label,
}: {
  href: string;
  aktif: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={aktif ? "page" : undefined}
      className={`tap inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
        aktif
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
