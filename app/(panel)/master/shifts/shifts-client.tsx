"use client";

import { useActionState, useCallback, useEffect, useState } from "react";

import { Clock4, Plus } from "lucide-react";

import {
  createShift,
  toggleShiftAktif,
  updateShift,
} from "@/app/actions/shifts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FormState } from "@/lib/form";
import type { ShiftRow } from "@/lib/types";

export function ShiftsClient({ shifts }: { shifts: ShiftRow[] }) {
  const [flash, setFlash] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ShiftRow | null>(null);

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
            <h2 className="section-title">Daftar Shift</h2>
            <p className="text-xs text-muted-foreground">
              {shifts.filter((s) => s.aktif).length} aktif · {shifts.length}{" "}
              total
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

        {shifts.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
            <Clock4 className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Belum ada shift. Klik “Tambah” untuk membuat Shift Pagi/Malam.
            </p>
          </div>
        ) : (
          <>
            <ul className="mt-4 flex flex-col gap-2 md:hidden">
              {shifts.map((shift) => (
                <li
                  key={shift.id}
                  className="rounded-[var(--radius-sm)] border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {shift.nama}
                      </p>
                      <p className="mono-num text-xs text-muted-foreground">
                        {shift.jamMulai}–{shift.jamSelesai} · toleransi{" "}
                        {shift.toleransiTelatMenit} menit
                      </p>
                    </div>
                    <span
                      className={`badge shrink-0 ${
                        shift.aktif ? "badge-green" : "badge-slate"
                      }`}
                    >
                      {shift.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="aksi"
                      onClick={() => {
                        setFlash(null);
                        setEditing(shift);
                      }}
                    >
                      Edit
                    </Button>
                    <ToggleAktif shift={shift} />
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>Toleransi telat</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.nama}</TableCell>
                      <TableCell className="mono-num">
                        {shift.jamMulai}–{shift.jamSelesai}
                      </TableCell>
                      <TableCell className="mono-num">
                        {shift.toleransiTelatMenit} menit
                      </TableCell>
                      <TableCell>
                        <span
                          className={`badge ${
                            shift.aktif ? "badge-green" : "badge-slate"
                          }`}
                        >
                          {shift.aktif ? "Aktif" : "Nonaktif"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="aksi"
                            onClick={() => {
                              setFlash(null);
                              setEditing(shift);
                            }}
                          >
                            Edit
                          </Button>
                          <ToggleAktif shift={shift} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      <ShiftFormSheet
        open={creating}
        shift={null}
        onClose={closeCreate}
        onSuccess={onSuccess}
      />
      <ShiftFormSheet
        open={editing !== null}
        shift={editing}
        onClose={closeEdit}
        onSuccess={onSuccess}
      />
    </>
  );
}

function ToggleAktif({ shift }: { shift: ShiftRow }) {
  return (
    <form action={toggleShiftAktif} className="inline">
      <input type="hidden" name="id" value={shift.id} />
      <Button
        type="submit"
        variant={shift.aktif ? "outline-bahaya" : "outline-ok"}
        size="aksi"
      >
        {shift.aktif ? "Nonaktifkan" : "Aktifkan"}
      </Button>
    </form>
  );
}

function ShiftFormSheet({
  open,
  shift,
  onClose,
  onSuccess,
}: {
  open: boolean;
  shift: ShiftRow | null;
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
      <SheetContent side="right" className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle>{shift ? "Edit Shift" : "Tambah Shift"}</SheetTitle>
          <SheetDescription>
            Shift malam cukup diisi 22:00–06:00; sistem memahami lewat tengah
            malam.
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <ShiftForm shift={shift} onClose={onClose} onSuccess={onSuccess} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ShiftForm({
  shift,
  onClose,
  onSuccess,
}: {
  shift: ShiftRow | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const action = shift ? updateShift : createShift;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    undefined,
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

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {shift ? <input type="hidden" name="id" value={shift.id} /> : null}

      <div className="field">
        <label className="field-label" htmlFor="nama">
          Nama Shift
        </label>
        <Input
          id="nama"
          name="nama"
          defaultValue={shift?.nama ?? ""}
          placeholder="Shift Malam"
          aria-invalid={Boolean(state?.errors?.nama)}
          required
        />
        {error("nama")}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="field">
          <label className="field-label" htmlFor="jamMulai">
            Jam Mulai
          </label>
          <Input
            id="jamMulai"
            name="jamMulai"
            type="time"
            defaultValue={shift?.jamMulai ?? "08:00"}
            aria-invalid={Boolean(state?.errors?.jamMulai)}
            className="mono-num"
            required
          />
          {error("jamMulai")}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="jamSelesai">
            Jam Selesai
          </label>
          <Input
            id="jamSelesai"
            name="jamSelesai"
            type="time"
            defaultValue={shift?.jamSelesai ?? "16:00"}
            aria-invalid={Boolean(state?.errors?.jamSelesai)}
            className="mono-num"
            required
          />
          {error("jamSelesai")}
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="toleransiTelatMenit">
          Toleransi Telat (menit)
        </label>
        <Input
          id="toleransiTelatMenit"
          name="toleransiTelatMenit"
          type="number"
          min={0}
          max={120}
          defaultValue={shift?.toleransiTelatMenit ?? 15}
          aria-invalid={Boolean(state?.errors?.toleransiTelatMenit)}
          className="mono-num"
        />
        {error("toleransiTelatMenit")}
      </div>

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
