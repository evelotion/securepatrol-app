"use client";

import { useCallback, useEffect, useState, useActionState } from "react";

import {
  createCheckpoint,
  toggleCheckpointAktif,
  updateCheckpoint,
} from "@/app/actions/checkpoints";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FormState } from "@/lib/form";
import type { CheckpointRow } from "@/lib/types";

export function CheckpointsClient({
  checkpoints,
}: {
  checkpoints: CheckpointRow[];
}) {
  const [flash, setFlash] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CheckpointRow | null>(null);
  const [printing, setPrinting] = useState<CheckpointRow | null>(null);

  const onSuccess = useCallback((message: string) => setFlash(message), []);
  const closeCreate = useCallback(() => setCreating(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);
  const closePrint = useCallback(() => setPrinting(null), []);

  return (
    <>
      {flash ? (
        <p role="status" className="alert-success">
          {flash}
        </p>
      ) : null}

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">Daftar Titik Patroli</h2>
          <Button
            size="sm"
            onClick={() => {
              setFlash(null);
              setCreating(true);
            }}
          >
            Tambah Checkpoint
          </Button>
        </div>

        <div className="glass-inset overflow-hidden rounded-lg">
          <Table className="min-w-[54rem]">
            <TableHeader>
              <TableRow>
                <TableHead>QR</TableHead>
                <TableHead>Nama Titik</TableHead>
                <TableHead>Kode Barcode</TableHead>
                <TableHead>Koordinat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkpoints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada titik patroli. Klik “Tambah Checkpoint”.
                  </TableCell>
                </TableRow>
              ) : (
                checkpoints.map((cp) => (
                  <TableRow key={cp.id}>
                    <TableCell>
                      <div
                        className="qr-box h-12 w-12 rounded-lg bg-white p-1"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{ __html: cp.qrSvg }}
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {cp.namaTitik}
                      </p>
                      {cp.keterangan ? (
                        <p className="text-xs text-muted-foreground">
                          {cp.keterangan}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <code className="rounded-md bg-white/70 px-2 py-1 text-xs font-semibold text-indigo-700">
                        {cp.kodeBarcode}
                      </code>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {cp.lat && cp.long ? `${cp.lat}, ${cp.long}` : "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`badge ${cp.aktif ? "badge-green" : "badge-slate"}`}
                      >
                        {cp.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPrinting(cp)}
                        >
                          Cetak
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFlash(null);
                            setEditing(cp);
                          }}
                        >
                          Edit
                        </Button>
                        <form action={toggleCheckpointAktif} className="inline">
                          <input type="hidden" name="id" value={cp.id} />
                          <Button
                            type="submit"
                            variant={cp.aktif ? "destructive" : "outline"}
                            size="sm"
                          >
                            {cp.aktif ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {creating ? (
        <CheckpointFormModal
          checkpoint={null}
          onClose={closeCreate}
          onSuccess={onSuccess}
        />
      ) : null}

      {editing ? (
        <CheckpointFormModal
          checkpoint={editing}
          onClose={closeEdit}
          onSuccess={onSuccess}
        />
      ) : null}

      {printing ? <PrintLabel checkpoint={printing} onClose={closePrint} /> : null}
    </>
  );
}

function CheckpointFormModal({
  checkpoint,
  onClose,
  onSuccess,
}: {
  checkpoint: CheckpointRow | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const action = checkpoint ? updateCheckpoint : createCheckpoint;
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/35 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-strong max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="section-title">
            {checkpoint ? "Edit Checkpoint" : "Tambah Checkpoint"}
          </h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          {checkpoint ? (
            <input type="hidden" name="id" value={checkpoint.id} />
          ) : null}

          <div className="field">
            <label className="field-label" htmlFor="namaTitik">
              Nama Titik
            </label>
            <Input
              id="namaTitik"
              name="namaTitik"
              defaultValue={checkpoint?.namaTitik ?? ""}
              placeholder="Lobi Utama"
              aria-invalid={Boolean(state?.errors?.namaTitik)}
              required
            />
            {error("namaTitik")}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="kodeBarcode">
              Kode Barcode <span className="normal-case">(opsional, otomatis bila kosong)</span>
            </label>
            <Input
              id="kodeBarcode"
              name="kodeBarcode"
              defaultValue={checkpoint?.kodeBarcode ?? ""}
              placeholder="SP-1A2B3C4D"
              aria-invalid={Boolean(state?.errors?.kodeBarcode)}
            />
            {error("kodeBarcode")}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="field">
              <label className="field-label" htmlFor="lat">
                Latitude
              </label>
              <Input
                id="lat"
                name="lat"
                inputMode="decimal"
                defaultValue={checkpoint?.lat ?? ""}
                placeholder="-6.2000000"
                aria-invalid={Boolean(state?.errors?.lat)}
              />
              {error("lat")}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="long">
                Longitude
              </label>
              <Input
                id="long"
                name="long"
                inputMode="decimal"
                defaultValue={checkpoint?.long ?? ""}
                placeholder="106.8166667"
                aria-invalid={Boolean(state?.errors?.long)}
              />
              {error("long")}
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="keterangan">
              Keterangan <span className="normal-case">(opsional)</span>
            </label>
            <Textarea
              id="keterangan"
              name="keterangan"
              rows={2}
              defaultValue={checkpoint?.keterangan ?? ""}
              placeholder="Di sebelah pilar lobi"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PrintLabel({
  checkpoint,
  onClose,
}: {
  checkpoint: CheckpointRow;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-strong w-full max-w-xs rounded-xl p-5">
        <div className="no-print mb-4 flex items-center justify-between">
          <h2 className="section-title">Label Checkpoint</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>

        <div className="print-area rounded-lg bg-white p-5 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            SecurePatrol
          </p>
          <div
            className="qr-box mx-auto my-3 h-44 w-44"
            dangerouslySetInnerHTML={{ __html: checkpoint.qrSvg }}
          />
          <p className="text-base font-bold text-foreground">
            {checkpoint.namaTitik}
          </p>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {checkpoint.kodeBarcode}
          </p>
          {checkpoint.keterangan ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {checkpoint.keterangan}
            </p>
          ) : null}
        </div>

        <Button className="mt-4 w-full" onClick={() => window.print()}>
          Cetak Label
        </Button>
      </div>
    </div>
  );
}
