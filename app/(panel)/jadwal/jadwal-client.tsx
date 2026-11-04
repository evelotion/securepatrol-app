"use client";

import { useActionState, useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { kosongkanJadwal, simpanJadwal } from "@/app/actions/jadwal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { FormState } from "@/lib/form";
import { formatTanggal } from "@/lib/format";
import { tambahHari, tanggalDB } from "@/lib/shift";
import type { JadwalMingguan, ShiftRow } from "@/lib/types";

const HARI_SINGKAT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

type Sel = {
  userId: string;
  nama: string;
  tanggal: string;
};

export function JadwalClient({ data }: { data: JadwalMingguan }) {
  const [flash, setFlash] = useState<string | null>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const close = useCallback(() => setSel(null), []);
  const onSuccess = useCallback((message: string) => setFlash(message), []);

  const cari = (userId: string, tanggal: string) =>
    data.jadwal.find((j) => j.userId === userId && j.tanggal === tanggal) ??
    null;

  const buka = (user: { id: string; nama: string }, tanggal: string) => {
    setFlash(null);
    setSel({ userId: user.id, nama: user.nama, tanggal });
  };

  const pekanSebelumnya = tambahHari(data.pekan, -7);
  const pekanBerikutnya = tambahHari(data.pekan, 7);

  return (
    <>
      {flash ? (
        <p role="status" className="alert-success">
          {flash}
        </p>
      ) : null}

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="section-title">
              {formatTanggal(tanggalDB(data.hari[0]))} –{" "}
              {formatTanggal(tanggalDB(data.hari[6]))}
            </h2>
            <p className="text-xs text-muted-foreground">
              Pekan dimulai Senin (WIB). Ketuk sel untuk memilih shift.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/jadwal?pekan=${pekanSebelumnya}`}
                aria-label="Pekan sebelumnya"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/jadwal?pekan=${pekanBerikutnya}`}
                aria-label="Pekan berikutnya"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        {data.users.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
            <CalendarDays
              className="size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              Belum ada personel aktif di regu ini.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: tabel mingguan */}
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="sticky left-0 bg-card py-2 pr-3 font-semibold">
                      Personel
                    </th>
                    {data.hari.map((tanggal, i) => (
                      <th key={tanggal} className="px-1 py-2 font-semibold">
                        <span className="block">{HARI_SINGKAT[i]}</span>
                        <span className="mono-num text-[0.7rem] font-normal normal-case">
                          {tanggal.slice(8)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr key={user.id} className="border-t border-border">
                      <th
                        scope="row"
                        className="sticky left-0 bg-card py-2 pr-3 text-left font-medium"
                      >
                        <span className="block truncate">{user.nama}</span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {user.regu ?? "—"}
                        </span>
                      </th>
                      {data.hari.map((tanggal) => {
                        const jadwal = cari(user.id, tanggal);
                        return (
                          <td key={tanggal} className="px-1 py-1.5">
                            <button
                              type="button"
                              onClick={() => buka(user, tanggal)}
                              className={`w-full rounded-[var(--radius-sm)] border px-2 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                jadwal
                                  ? "border-primary/30 bg-primary/10 font-semibold text-foreground"
                                  : "border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              }`}
                              aria-label={`Atur jadwal ${user.nama} ${tanggal}`}
                            >
                              {jadwal ? jadwal.shiftNama : "—"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* HP: kartu per personel, 7 hari dalam satu baris */}
            <ul className="mt-4 flex flex-col gap-2 md:hidden">
              {data.users.map((user) => (
                <li
                  key={user.id}
                  className="rounded-[var(--radius-sm)] border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {user.nama}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.regu ?? "—"}
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {data.hari.map((tanggal, i) => {
                      const jadwal = cari(user.id, tanggal);
                      return (
                        <button
                          key={tanggal}
                          type="button"
                          onClick={() => buka(user, tanggal)}
                          className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] border px-1 py-1.5 text-[0.65rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            jadwal
                              ? "border-primary/30 bg-primary/10 text-foreground"
                              : "border-dashed border-border text-muted-foreground"
                          }`}
                          aria-label={`Atur jadwal ${user.nama} ${tanggal}`}
                        >
                          <span>{HARI_SINGKAT[i]}</span>
                          <span
                            className={`truncate text-[0.6rem] font-normal ${
                              jadwal ? "text-primary" : ""
                            }`}
                          >
                            {jadwal ? jadwal.shiftNama.slice(0, 5) : "—"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <JadwalSheet
        sel={sel}
        shifts={data.shifts}
        existing={
          sel ? (cari(sel.userId, sel.tanggal)?.shiftId ?? null) : null
        }
        onClose={close}
        onSuccess={onSuccess}
      />
    </>
  );
}

function JadwalSheet({
  sel,
  shifts,
  existing,
  onClose,
  onSuccess,
}: {
  sel: Sel | null;
  shifts: ShiftRow[];
  existing: string | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  return (
    <Sheet
      open={sel !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent side="right" className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle>Atur Jadwal</SheetTitle>
          <SheetDescription>
            {sel
              ? `${sel.nama} · ${formatTanggal(tanggalDB(sel.tanggal))}`
              : "Pilih shift jaga."}
          </SheetDescription>
        </SheetHeader>

        {sel ? (
          <JadwalForm
            key={`${sel.userId}-${sel.tanggal}`}
            sel={sel}
            shifts={shifts}
            existing={existing}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function JadwalForm({
  sel,
  shifts,
  existing,
  onClose,
  onSuccess,
}: {
  sel: Sel;
  shifts: ShiftRow[];
  existing: string | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    simpanJadwal,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      onSuccess(state.message ?? "Jadwal tersimpan.");
      onClose();
    }
  }, [state, onClose, onSuccess]);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="userId" value={sel.userId} />
        <input type="hidden" name="tanggal" value={sel.tanggal} />

        <div className="field">
          <label className="field-label" htmlFor="shiftId">
            Shift
          </label>
          <Select
            id="shiftId"
            name="shiftId"
            defaultValue={existing ?? shifts[0]?.id ?? ""}
            aria-invalid={Boolean(state?.errors?.shiftId)}
            required
          >
            {shifts.length === 0 ? (
              <option value="">Belum ada shift aktif</option>
            ) : null}
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama} ({s.jamMulai}–{s.jamSelesai})
              </option>
            ))}
          </Select>
          {state?.errors?.shiftId ? (
            <p className="field-error">{state.errors.shiftId}</p>
          ) : null}
          {state?.errors?.tanggal ? (
            <p className="field-error">{state.errors.tanggal}</p>
          ) : null}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending || shifts.length === 0}
        >
          {pending ? "Menyimpan…" : "Simpan Jadwal"}
        </Button>
      </form>

      {existing ? (
        <form action={kosongkanJadwal}>
          <input type="hidden" name="userId" value={sel.userId} />
          <input type="hidden" name="tanggal" value={sel.tanggal} />
          <Button type="submit" variant="destructive" className="w-full">
            Kosongkan Jadwal
          </Button>
        </form>
      ) : null}

      <Button type="button" variant="outline" className="w-full" onClick={onClose}>
        Tutup
      </Button>
    </div>
  );
}
