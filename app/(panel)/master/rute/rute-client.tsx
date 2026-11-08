"use client";

import { useActionState, useCallback, useEffect, useState } from "react";

import { Plus, Route } from "lucide-react";

import { createRute, toggleRuteAktif, updateRute } from "@/app/actions/rute";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { FormState } from "@/lib/form";
import type { RuteRow, ShiftRow } from "@/lib/types";

type CheckpointPilihan = { id: string; namaTitik: string; aktif: boolean };

export function RuteClient({
  rute,
  shifts,
  checkpoints,
}: {
  rute: RuteRow[];
  shifts: ShiftRow[];
  checkpoints: CheckpointPilihan[];
}) {
  const [flash, setFlash] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RuteRow | null>(null);

  const onSuccess = useCallback((message: string) => setFlash(message), []);
  const closeCreate = useCallback(() => setCreating(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  return (
    <>
      {flash ? (
        <p role="status" className="alert-success">
          {flash}
        </p>
      ) : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="section-title">Daftar Rute</h2>
            <p className="text-xs text-muted-foreground">
              {rute.filter((r) => r.aktif).length} aktif · {rute.length} total
            </p>
          </div>
          <Button
            onClick={() => {
              setFlash(null);
              setCreating(true);
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            Tambah
          </Button>
        </div>

        {rute.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
            <Route className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Belum ada rute. Buat rute seperti “Rute Malam”: 12 titik, 4
              putaran, tiap 2 jam.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {rute.map((item) => (
              <li
                key={item.id}
                className="flex flex-col rounded-[var(--radius-sm)] border border-border p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.nama}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.shiftNama ?? "Semua shift"} ·{" "}
                      {item.targetPutaran} putaran · tiap {item.intervalMenit}{" "}
                      menit
                    </p>
                  </div>
                  <span
                    className={`badge shrink-0 ${
                      item.aktif ? "badge-green" : "badge-slate"
                    }`}
                  >
                    {item.aktif ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                <ol className="mt-3 flex flex-wrap gap-1.5">
                  {item.titik.map((t) => (
                    <li
                      key={t.checkpointId}
                      className="badge badge-indigo"
                      title={`Urutan ${t.urutan}`}
                    >
                      <span className="mono-num">{t.urutan}.</span>{" "}
                      {t.namaTitik}
                    </li>
                  ))}
                </ol>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="aksi"
                    onClick={() => {
                      setFlash(null);
                      setEditing(item);
                    }}
                  >
                    Edit
                  </Button>
                  <form action={toggleRuteAktif} className="inline">
                    <input type="hidden" name="id" value={item.id} />
                    <Button
                      type="submit"
                      variant={item.aktif ? "outline-bahaya" : "outline-ok"}
                      size="aksi"
                    >
                      {item.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <RuteFormSheet
        open={creating}
        rute={null}
        shifts={shifts}
        checkpoints={checkpoints}
        onClose={closeCreate}
        onSuccess={onSuccess}
      />
      <RuteFormSheet
        open={editing !== null}
        rute={editing}
        shifts={shifts}
        checkpoints={checkpoints}
        onClose={closeEdit}
        onSuccess={onSuccess}
      />
    </>
  );
}

function RuteFormSheet({
  open,
  rute,
  shifts,
  checkpoints,
  onClose,
  onSuccess,
}: {
  open: boolean;
  rute: RuteRow | null;
  shifts: ShiftRow[];
  checkpoints: CheckpointPilihan[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{rute ? "Edit Rute" : "Tambah Rute"}</SheetTitle>
          <SheetDescription>
            Pilih shift dan titik, lalu atur urutannya. Rute tanpa shift
            berlaku untuk semua shift.
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <RuteForm
            rute={rute}
            shifts={shifts}
            checkpoints={checkpoints}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

type Pilihan = Record<string, { pilih: boolean; urutan: string }>;

function awalPilihan(
  rute: RuteRow | null,
  checkpoints: CheckpointPilihan[],
): Pilihan {
  const hasil: Pilihan = {};
  for (const cp of checkpoints) {
    const titik = rute?.titik.find((t) => t.checkpointId === cp.id);
    hasil[cp.id] = {
      pilih: titik !== undefined,
      urutan: String(titik?.urutan ?? ""),
    };
  }
  return hasil;
}

function RuteForm({
  rute,
  shifts,
  checkpoints,
  onClose,
  onSuccess,
}: {
  rute: RuteRow | null;
  shifts: ShiftRow[];
  checkpoints: CheckpointPilihan[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const action = rute ? updateRute : createRute;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    undefined,
  );
  const [pilihan, setPilihan] = useState<Pilihan>(() =>
    awalPilihan(rute, checkpoints),
  );

  useEffect(() => {
    if (state?.ok) {
      onSuccess(state.message ?? "Data tersimpan.");
      onClose();
    }
  }, [state, onClose, onSuccess]);

  const error = (key: string) =>
    state?.errors?.[key] ? (
      <p className="field-error">{state.errors[key]}</p>
    ) : null;

  const ubah = (id: string, patch: Partial<Pilihan[string]>) =>
    setPilihan((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {rute ? <input type="hidden" name="id" value={rute.id} /> : null}

      <div className="field">
        <label className="field-label" htmlFor="nama">
          Nama Rute
        </label>
        <Input
          id="nama"
          name="nama"
          defaultValue={rute?.nama ?? ""}
          placeholder="Rute Malam"
          aria-invalid={Boolean(state?.errors?.nama)}
          required
        />
        {error("nama")}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="shiftId">
          Shift
        </label>
        <Select
          id="shiftId"
          name="shiftId"
          defaultValue={rute?.shiftId ?? ""}
          aria-invalid={Boolean(state?.errors?.shiftId)}
        >
          <option value="">Semua shift (cadangan)</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama} ({s.jamMulai}–{s.jamSelesai})
            </option>
          ))}
        </Select>
        {error("shiftId")}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="field">
          <label className="field-label" htmlFor="targetPutaran">
            Target Putaran
          </label>
          <Input
            id="targetPutaran"
            name="targetPutaran"
            type="number"
            min={1}
            max={12}
            defaultValue={rute?.targetPutaran ?? 4}
            aria-invalid={Boolean(state?.errors?.targetPutaran)}
            className="mono-num"
            required
          />
          {error("targetPutaran")}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="intervalMenit">
            Interval (menit)
          </label>
          <Input
            id="intervalMenit"
            name="intervalMenit"
            type="number"
            min={15}
            max={480}
            defaultValue={rute?.intervalMenit ?? 120}
            aria-invalid={Boolean(state?.errors?.intervalMenit)}
            className="mono-num"
            required
          />
          {error("intervalMenit")}
        </div>
      </div>

      <fieldset className="field">
        <legend className="field-label">Titik & urutan</legend>
        {checkpoints.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada checkpoint. Tambah titik di Master Checkpoint dahulu.
          </p>
        ) : (
          <ul className="mt-1 max-h-64 divide-y divide-border overflow-y-auto rounded-[var(--radius-sm)] border border-border">
            {checkpoints.map((cp) => (
              <li
                key={cp.id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <input
                  id={`pilih_${cp.id}`}
                  name={`pilih_${cp.id}`}
                  type="checkbox"
                  checked={pilihan[cp.id]?.pilih ?? false}
                  onChange={(e) => ubah(cp.id, { pilih: e.target.checked })}
                  className="size-5 shrink-0 accent-[var(--primary)]"
                />
                <label
                  htmlFor={`pilih_${cp.id}`}
                  className="min-w-0 flex-1 truncate text-sm"
                >
                  {cp.namaTitik}
                  {cp.aktif ? "" : " (nonaktif)"}
                </label>
                <Input
                  name={`urutan_${cp.id}`}
                  type="number"
                  min={1}
                  max={Math.max(checkpoints.length, 1)}
                  value={pilihan[cp.id]?.urutan ?? ""}
                  onChange={(e) => ubah(cp.id, { urutan: e.target.value })}
                  aria-label={`Urutan ${cp.namaTitik}`}
                  placeholder="—"
                  className="mono-num w-16 shrink-0"
                />
              </li>
            ))}
          </ul>
        )}
        {error("titik")}
      </fieldset>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={onClose}>
          Batal
        </Button>
      </div>
    </form>
  );
}
