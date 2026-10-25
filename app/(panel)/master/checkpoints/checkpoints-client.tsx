"use client";

import { useCallback, useEffect, useState, useActionState } from "react";

import {
  createCheckpoint,
  toggleCheckpointAktif,
  updateCheckpoint,
} from "@/app/actions/checkpoints";
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

      <section className="glass rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">Daftar Titik Patroli</h2>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setFlash(null);
              setCreating(true);
            }}
          >
            + Tambah Checkpoint
          </button>
        </div>

        <div className="table-wrap glass-inset">
          <table className="table">
            <thead>
              <tr>
                <th>QR</th>
                <th>Nama Titik</th>
                <th>Kode Barcode</th>
                <th>Koordinat</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {checkpoints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Belum ada titik patroli. Klik “Tambah Checkpoint”.
                  </td>
                </tr>
              ) : (
                checkpoints.map((cp) => (
                  <tr key={cp.id}>
                    <td>
                      <div
                        className="qr-box h-12 w-12 rounded-lg bg-white p-1"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{ __html: cp.qrSvg }}
                      />
                    </td>
                    <td>
                      <p className="font-semibold text-slate-800">
                        {cp.namaTitik}
                      </p>
                      {cp.keterangan ? (
                        <p className="text-xs text-slate-400">
                          {cp.keterangan}
                        </p>
                      ) : null}
                    </td>
                    <td>
                      <code className="rounded-md bg-white/70 px-2 py-1 text-xs font-semibold text-indigo-700">
                        {cp.kodeBarcode}
                      </code>
                    </td>
                    <td className="text-xs text-slate-500">
                      {cp.lat && cp.long ? `${cp.lat}, ${cp.long}` : "—"}
                    </td>
                    <td>
                      <span
                        className={`badge ${cp.aktif ? "badge-green" : "badge-slate"}`}
                      >
                        {cp.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setPrinting(cp)}
                        >
                          Cetak
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setFlash(null);
                            setEditing(cp);
                          }}
                        >
                          Edit
                        </button>
                        <form action={toggleCheckpointAktif} className="inline">
                          <input type="hidden" name="id" value={cp.id} />
                          <button
                            type="submit"
                            className={`btn btn-sm ${cp.aktif ? "btn-danger" : "btn-ghost"}`}
                          >
                            {cp.aktif ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

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
      <div className="glass-strong max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="section-title">
            {checkpoint ? "Edit Checkpoint" : "Tambah Checkpoint"}
          </h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          {checkpoint ? (
            <input type="hidden" name="id" value={checkpoint.id} />
          ) : null}

          <div className="field">
            <label className="field-label" htmlFor="namaTitik">
              Nama Titik
            </label>
            <input
              className="input"
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
            <input
              className="input"
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
              <input
                className="input"
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
              <input
                className="input"
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
            <textarea
              className="textarea"
              id="keterangan"
              name="keterangan"
              rows={2}
              defaultValue={checkpoint?.keterangan ?? ""}
              placeholder="Di sebelah pilar lobi"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={pending}
            >
              {pending ? "Menyimpan…" : "Simpan"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Batal
            </button>
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
      <div className="glass-strong w-full max-w-xs rounded-2xl p-5">
        <div className="no-print mb-4 flex items-center justify-between">
          <h2 className="section-title">Label Checkpoint</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>

        <div className="print-area rounded-2xl bg-white p-5 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            SecurePatrol
          </p>
          <div
            className="qr-box mx-auto my-3 h-44 w-44"
            dangerouslySetInnerHTML={{ __html: checkpoint.qrSvg }}
          />
          <p className="text-base font-bold text-slate-900">
            {checkpoint.namaTitik}
          </p>
          <p className="mt-1 font-mono text-sm text-slate-600">
            {checkpoint.kodeBarcode}
          </p>
          {checkpoint.keterangan ? (
            <p className="mt-1 text-xs text-slate-500">
              {checkpoint.keterangan}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          className="btn btn-primary mt-4 w-full"
          onClick={() => window.print()}
        >
          Cetak Label
        </button>
      </div>
    </div>
  );
}
