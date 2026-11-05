import { Suspense } from "react";

import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getDetailAbsensi } from "@/lib/data-detail";
import { formatDateTime } from "@/lib/format";
import { tautanPeta } from "@/lib/insiden";

export const metadata = { title: "Detail Absensi" };

export default function DetailAbsensiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-[var(--radius)]" />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getDetailAbsensi(id);

  const sisi = [
    { judul: "Masuk", waktu: d.waktuMasuk, data: d.masuk },
    { judul: "Keluar", waktu: d.waktuKeluar, data: d.keluar },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kembali ke dashboard
      </Link>

      <header>
        <p className="eyebrow">Bukti absensi</p>
        <h1 className="page-title mt-1">{d.nama}</h1>
        <p className="page-sub mt-0.5">
          {d.regu ?? "Tanpa regu"}
          {d.shift ? ` · ${d.shift}` : ""}
          {d.statusHadir ? ` · ${d.statusHadir.replace("_", " ").toLowerCase()}` : ""}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {sisi.map(({ judul, waktu, data }) => {
          const peta = tautanPeta(data.lat, data.long);
          return (
            <Card key={judul} className="p-4">
              <h2 className="section-title">{judul}</h2>
              <p className="mono-num text-xs text-muted-foreground">
                {waktu ? formatDateTime(waktu) : "Belum absen keluar"}
              </p>
              {data.fotoId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/foto/${data.fotoId}`}
                  alt={`Foto absen ${judul.toLowerCase()} ${d.nama}`}
                  className="mt-3 max-h-96 w-full rounded-[var(--radius-sm)] border border-border object-cover"
                />
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Tidak ada foto.</p>
              )}
              <p className="mono-num mt-3 text-xs text-muted-foreground">
                {data.lat && data.long ? `${data.lat}, ${data.long}` : "Lokasi tidak tersedia"}
              </p>
              {peta ? (
                <a
                  href={peta}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Buka lokasi di peta
                </a>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
