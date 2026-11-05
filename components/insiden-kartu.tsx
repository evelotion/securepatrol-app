"use client";

import { useActionState } from "react";

import { CheckCircle2, HandHelping, MapPin } from "lucide-react";

import { selesaikanInsiden, tanganiInsiden } from "@/app/actions/insiden";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/form";
import { formatDateTime } from "@/lib/format";
import {
  KATEGORI_LABEL,
  PRIORITAS_BADGE,
  PRIORITAS_LABEL,
  STATUS_BADGE,
  STATUS_LABEL,
  tautanPeta,
} from "@/lib/insiden";
import type { InsidenRow } from "@/lib/types";

/** Pesan galat/sukses dari server action. */
function Pesan({ state }: { state: FormState }) {
  if (state?.errors) {
    return (
      <>
        {Object.values(state.errors).map((pesan) => (
          <p key={pesan} role="alert" className="alert-error">
            {pesan}
          </p>
        ))}
      </>
    );
  }
  return state?.message ? (
    <p role="status" className="alert-success">
      {state.message}
    </p>
  ) : null;
}

/** Tombol "Saya tangani" (BARU -> DITANGANI). */
export function TombolTangani({
  id,
  kompak = false,
}: {
  id: string;
  kompak?: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    tanganiInsiden,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        disabled={pending}
        variant={kompak ? "secondary" : "default"}
        className={kompak ? "min-h-12" : "w-full"}
      >
        <HandHelping className="size-4" aria-hidden="true" />
        {pending ? "Memproses…" : "Saya tangani"}
      </Button>
      <Pesan state={state} />
    </form>
  );
}

function FormSelesai({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    selesaikanInsiden,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="field-label" htmlFor={`catatan-${id}`}>
        Catatan tindak lanjut
      </label>
      <Textarea
        id={`catatan-${id}`}
        name="catatan"
        maxLength={1000}
        placeholder="Apa yang sudah dilakukan?"
        required
      />
      <Button type="submit" disabled={pending} className="w-full">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        {pending ? "Menyimpan…" : "Tandai selesai"}
      </Button>
      <Pesan state={state} />
    </form>
  );
}

/**
 * Kartu satu insiden. `bolehKelola` hanya menampilkan tombol aksi — izin
 * sebenarnya tetap dicek di server action.
 */
export function InsidenKartu({
  item,
  bolehKelola,
  tampilPelapor,
}: {
  item: InsidenRow;
  bolehKelola: boolean;
  tampilPelapor: boolean;
}) {
  const peta = tautanPeta(item.lat, item.long);
  const darurat = item.prioritas === "DARURAT";

  return (
    <li
      className={`rounded-[var(--radius)] border bg-card p-4 ${
        darurat && item.status === "BARU"
          ? "border-[var(--status-bad)]"
          : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {KATEGORI_LABEL[item.kategori]}
          </p>
          <p className="mono-num text-xs text-muted-foreground">
            {formatDateTime(item.dibuatPada)}
            {tampilPelapor
              ? ` · ${item.namaPelapor}${item.reguPelapor ? ` (${item.reguPelapor})` : ""}`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <span className={`badge ${PRIORITAS_BADGE[item.prioritas]}`}>
            {PRIORITAS_LABEL[item.prioritas]}
          </span>
          <span className={`badge ${STATUS_BADGE[item.status]}`}>
            {STATUS_LABEL[item.status]}
          </span>
        </div>
      </div>

      <p className="mt-2 whitespace-pre-line text-sm text-foreground">
        {item.deskripsi}
      </p>

      {item.namaTitik || peta ? (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {item.namaTitik ? <span>Titik: {item.namaTitik}</span> : null}
          {peta ? (
            <a
              href={peta}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <MapPin className="size-3.5" aria-hidden="true" />
              Lihat lokasi
              {item.akurasiM !== null ? ` (±${item.akurasiM} m)` : ""}
            </a>
          ) : null}
        </p>
      ) : null}

      {item.fotoIds.length > 0 ? (
        <ul className="mt-3 flex gap-2">
          {item.fotoIds.map((fotoId, i) => (
            <li key={fotoId}>
              <a
                href={`/api/foto/${fotoId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Buka foto ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/foto/${fotoId}`}
                  alt={`Foto insiden ${i + 1}`}
                  loading="lazy"
                  className="size-20 rounded-[var(--radius-sm)] border border-border object-cover"
                />
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {item.status !== "BARU" ? (
        <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
          {item.namaPenangan
            ? `Ditangani oleh ${item.namaPenangan}`
            : "Sudah ditangani"}
          {item.ditanganiPada ? ` · ${formatDateTime(item.ditanganiPada)}` : ""}
          {item.catatanTindakLanjut ? (
            <span className="mt-1 block text-foreground">
              Catatan: {item.catatanTindakLanjut}
            </span>
          ) : null}
        </p>
      ) : null}

      {bolehKelola && item.status === "BARU" ? (
        <div className="mt-3">
          <TombolTangani id={item.id} />
        </div>
      ) : null}
      {bolehKelola && item.status === "DITANGANI" ? (
        <div className="mt-3 border-t border-border pt-3">
          <FormSelesai id={item.id} />
        </div>
      ) : null}
    </li>
  );
}
