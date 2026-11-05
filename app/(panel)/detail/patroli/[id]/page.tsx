import { Suspense } from "react";

import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { StatusScanBadge } from "@/components/status-scan";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getDetailPatroli } from "@/lib/data-detail";
import { formatDateTime } from "@/lib/format";
import { petaRelatif } from "@/lib/peta";

export const metadata = { title: "Detail Patroli" };

const UKURAN = 240;

export default function DetailPatroliPage({
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
  const d = await getDetailPatroli(id);
  const peta =
    d.posisiHP && d.posisiTitik ? petaRelatif(d.posisiTitik, d.posisiHP, UKURAN) : null;

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
        <p className="eyebrow">Bukti patroli</p>
        <h1 className="page-title mt-1">{d.namaTitik}</h1>
        <p className="page-sub mt-0.5">
          {d.nama}
          {d.regu ? ` · ${d.regu}` : ""} · {formatDateTime(d.waktu)}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="section-title">Validasi</h2>
            <StatusScanBadge status={d.status} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="eyebrow">Jarak dari titik</dt>
              <dd className="mono-num mt-0.5 font-semibold">
                {d.jarakM !== null ? `${d.jarakM} m` : "—"}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Akurasi GPS</dt>
              <dd className="mono-num mt-0.5 font-semibold">
                {d.akurasiM !== null ? `±${d.akurasiM} m` : "—"}
              </dd>
            </div>
          </dl>
          {d.alasan ? (
            <p className="alert-warn mt-3">Alasan: {d.alasan}</p>
          ) : null}

          {peta ? (
            <figure className="mt-4">
              <svg
                viewBox={`0 0 ${UKURAN} ${UKURAN}`}
                role="img"
                aria-label={`Posisi HP ${Math.round(peta.jarakM)} meter dari titik patroli`}
                className="mx-auto w-full max-w-60 rounded-[var(--radius-sm)] border border-border bg-muted"
              >
                <line
                  x1={peta.titik.x}
                  y1={peta.titik.y}
                  x2={peta.hp.x}
                  y2={peta.hp.y}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 3"
                />
                <circle cx={peta.titik.x} cy={peta.titik.y} r="7" fill="var(--status-ok)" />
                <circle cx={peta.hp.x} cy={peta.hp.y} r="7" fill="var(--primary)" />
              </svg>
              <figcaption className="mt-2 flex flex-wrap justify-center gap-x-4 text-xs text-muted-foreground">
                <span>● Hijau: titik patroli</span>
                <span>● Biru: posisi HP</span>
                <span>Utara di atas</span>
              </figcaption>
            </figure>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Diagram posisi tidak tersedia
              {!d.posisiTitik ? " (titik belum dipetakan)" : " (HP tidak mengirim lokasi)"}.
            </p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="section-title">Foto area</h2>
          {d.fotoId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/foto/${d.fotoId}`}
              alt={`Foto area ${d.namaTitik}`}
              className="mt-3 max-h-96 w-full rounded-[var(--radius-sm)] border border-border object-cover"
            />
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Tidak ada foto.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
