"use client";

import { useActionState, useState } from "react";

import { Send } from "lucide-react";

import { laporInsiden } from "@/app/actions/insiden";
import { CameraCapture } from "@/components/camera-capture";
import { GpsStatus } from "@/components/gps-status";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/form";
import {
  DESKRIPSI_MAKS,
  FOTO_MAKS,
  KATEGORI_INSIDEN,
  KATEGORI_LABEL,
  PRIORITAS_INSIDEN,
  PRIORITAS_LABEL,
} from "@/lib/insiden";
import { useGeolocation } from "@/lib/use-geolocation";

/** Form laporan insiden: kategori, prioritas, deskripsi, foto (maks 3), GPS, titik terkait. */
export function InsidenForm({
  checkpoints,
  titikAwal,
  actorName,
}: {
  checkpoints: { id: string; namaTitik: string }[];
  titikAwal: string;
  actorName: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    laporInsiden,
    undefined,
  );
  const gps = useGeolocation();
  const [fotos, setFotos] = useState<(string | null)[]>([null]);

  // Setelah terkirim, kosongkan foto (pola "simpan state render sebelumnya").
  const [prevState, setPrevState] = useState<FormState>(undefined);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.ok) setFotos([null]);
  }

  const terisi = fotos.filter((f): f is string => f !== null);
  const koordinat = gps.posisi
    ? `${gps.posisi.lat.toFixed(6)}, ${gps.posisi.long.toFixed(6)}`
    : null;
  const watermark = `${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}\n${
    koordinat ?? "Lokasi GPS tidak tersedia"
  }\n${actorName}`;

  function ubahFoto(index: number, key: string | null) {
    setFotos((lama) => {
      const baru = [...lama];
      baru[index] = key;
      // Selalu sediakan satu slot kosong berikutnya sampai batas maksimum.
      const adaKosong = baru.some((f) => f === null);
      if (!adaKosong && baru.length < FOTO_MAKS) baru.push(null);
      return baru;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.message ? (
        <p role="status" className="alert-success">
          {state.message}
        </p>
      ) : null}
      {state?.errors
        ? Object.values(state.errors).map((pesan) => (
            <p key={pesan} role="alert" className="alert-error">
              {pesan}
            </p>
          ))
        : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label className="field-label" htmlFor="kategori">
            Kategori
          </label>
          <Select id="kategori" name="kategori" defaultValue="LAINNYA" required>
            {KATEGORI_INSIDEN.map((k) => (
              <option key={k} value={k}>
                {KATEGORI_LABEL[k]}
              </option>
            ))}
          </Select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="prioritas">
            Prioritas
          </label>
          <Select id="prioritas" name="prioritas" defaultValue="SEDANG" required>
            {PRIORITAS_INSIDEN.map((p) => (
              <option key={p} value={p}>
                {PRIORITAS_LABEL[p]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="deskripsi">
          Apa yang terjadi?
        </label>
        <Textarea
          id="deskripsi"
          name="deskripsi"
          maxLength={DESKRIPSI_MAKS}
          placeholder="Tulis kronologi singkat dan lokasi kejadian."
          required
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="checkpointId">
          Titik terkait (opsional)
        </label>
        <Select
          id="checkpointId"
          name="checkpointId"
          defaultValue={
            checkpoints.some((c) => c.id === titikAwal) ? titikAwal : ""
          }
        >
          <option value="">Tidak ada</option>
          {checkpoints.map((c) => (
            <option key={c.id} value={c.id}>
              {c.namaTitik}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        <p className="field-label">Foto bukti (opsional, maks {FOTO_MAKS})</p>
        {fotos.map((key, index) => (
          <CameraCapture
            key={index}
            value={key}
            onChange={(nilai) => ubahFoto(index, nilai)}
            watermark={watermark}
            label={`Foto ${index + 1}`}
            facing="environment"
            hint="Ambil foto kejadian atau kerusakan."
          />
        ))}
        {terisi.map((key) => (
          <input key={key} type="hidden" name="foto" value={key} />
        ))}
      </div>

      <GpsStatus gps={gps} koordinat={koordinat} />
      <input type="hidden" name="lat" value={gps.posisi ? String(gps.posisi.lat) : ""} />
      <input type="hidden" name="long" value={gps.posisi ? String(gps.posisi.long) : ""} />
      <input
        type="hidden"
        name="accuracy"
        value={gps.posisi?.accuracy == null ? "" : String(gps.posisi.accuracy)}
      />

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <Send className="size-5" aria-hidden="true" />
        {pending ? "Mengirim…" : "Kirim Laporan"}
      </Button>
    </form>
  );
}
