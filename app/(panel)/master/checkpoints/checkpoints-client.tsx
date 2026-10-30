"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Printer,
  Search,
} from "lucide-react";

import {
  createCheckpoint,
  toggleCheckpointAktif,
  updateCheckpoint,
} from "@/app/actions/checkpoints";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/form";
import type { CheckpointRow } from "@/lib/types";

const PER_HALAMAN = 8;

export function CheckpointsClient({
  checkpoints,
}: {
  checkpoints: CheckpointRow[];
}) {
  const [flash, setFlash] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CheckpointRow | null>(null);
  const [printing, setPrinting] = useState<CheckpointRow | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"semua" | "aktif" | "nonaktif">(
    "semua",
  );
  const [halaman, setHalaman] = useState(1);

  const onSuccess = useCallback((message: string) => setFlash(message), []);
  const closeCreate = useCallback(() => setCreating(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);
  const closePrint = useCallback(() => setPrinting(null), []);

  const q = query.trim().toLowerCase();
  const filtered = checkpoints.filter((cp) => {
    const cocokQ =
      q === "" ||
      cp.namaTitik.toLowerCase().includes(q) ||
      cp.kodeBarcode.toLowerCase().includes(q) ||
      (cp.keterangan ?? "").toLowerCase().includes(q);
    const cocokStatus =
      status === "semua" || (status === "aktif" ? cp.aktif : !cp.aktif);
    return cocokQ && cocokStatus;
  });

  const totalHalaman = Math.max(1, Math.ceil(filtered.length / PER_HALAMAN));
  const aktifHalaman = Math.min(halaman, totalHalaman);
  const mulai = (aktifHalaman - 1) * PER_HALAMAN;
  const rows = filtered.slice(mulai, mulai + PER_HALAMAN);

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
            <h2 className="section-title">Daftar Titik</h2>
            <p className="text-xs text-muted-foreground">
              {checkpoints.filter((c) => c.aktif).length} aktif ·{" "}
              {checkpoints.length} total
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

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHalaman(1);
              }}
              placeholder="Cari titik atau kode barcode…"
              aria-label="Cari checkpoint"
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "semua" | "aktif" | "nonaktif");
              setHalaman(1);
            }}
            aria-label="Filter status titik"
            className="sm:w-40"
          >
            <option value="semua">Semua status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
            <MapPin className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {checkpoints.length === 0
                ? "Belum ada titik patroli. Klik “Tambah”."
                : "Tidak ada titik yang cocok dengan pencarian."}
            </p>
          </div>
        ) : (
          <>
            {/* HP: kartu */}
            <ul className="mt-4 flex flex-col gap-2 md:hidden">
              {rows.map((cp) => (
                <li
                  key={cp.id}
                  className="rounded-[var(--radius-sm)] border border-border p-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="qr-box size-12 shrink-0 rounded-[var(--radius-sm)] bg-white p-1"
                      aria-hidden="true"
                      dangerouslySetInnerHTML={{ __html: cp.qrSvg }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {cp.namaTitik}
                      </p>
                      <p className="mono-num truncate text-xs text-muted-foreground">
                        {cp.kodeBarcode}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {cp.lat && cp.long
                          ? `${cp.lat}, ${cp.long}`
                          : "Tanpa koordinat"}
                      </p>
                    </div>
                    <span
                      className={`badge shrink-0 ${
                        cp.aktif ? "badge-green" : "badge-slate"
                      }`}
                    >
                      {cp.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrinting(cp)}
                    >
                      <Printer className="size-4" aria-hidden="true" />
                      Cetak
                    </Button>
                    <ToggleAktif checkpoint={cp} />
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: tabel */}
            <div className="mt-4 hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>QR</TableHead>
                    <TableHead>Nama Titik</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Koordinat</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((cp) => (
                    <TableRow key={cp.id}>
                      <TableCell>
                        <div
                          className="qr-box size-10 rounded-[var(--radius-sm)] bg-white p-1"
                          aria-hidden="true"
                          dangerouslySetInnerHTML={{ __html: cp.qrSvg }}
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{cp.namaTitik}</p>
                        {cp.keterangan ? (
                          <p className="text-xs text-muted-foreground">
                            {cp.keterangan}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <code className="mono-num rounded-[var(--radius-sm)] bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                          {cp.kodeBarcode}
                        </code>
                      </TableCell>
                      <TableCell className="mono-num text-xs text-muted-foreground">
                        {cp.lat && cp.long ? `${cp.lat}, ${cp.long}` : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`badge ${
                            cp.aktif ? "badge-green" : "badge-slate"
                          }`}
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
                            aria-label={`Cetak label ${cp.namaTitik}`}
                          >
                            <Printer className="size-4" aria-hidden="true" />
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
                          <ToggleAktif checkpoint={cp} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                {mulai + 1}–{Math.min(mulai + PER_HALAMAN, filtered.length)} dari{" "}
                {filtered.length} titik
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHalaman(Math.max(1, aktifHalaman - 1))}
                  disabled={aktifHalaman <= 1}
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <span className="mono-num text-xs font-semibold text-muted-foreground">
                  {aktifHalaman} / {totalHalaman}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setHalaman(Math.min(totalHalaman, aktifHalaman + 1))
                  }
                  disabled={aktifHalaman >= totalHalaman}
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <CheckpointFormSheet
        open={creating}
        checkpoint={null}
        onClose={closeCreate}
        onSuccess={onSuccess}
      />

      <CheckpointFormSheet
        open={editing !== null}
        checkpoint={editing}
        onClose={closeEdit}
        onSuccess={onSuccess}
      />

      {printing ? <PrintLabel checkpoint={printing} onClose={closePrint} /> : null}
    </>
  );
}

function ToggleAktif({ checkpoint }: { checkpoint: CheckpointRow }) {
  return (
    <form action={toggleCheckpointAktif} className="inline">
      <input type="hidden" name="id" value={checkpoint.id} />
      <Button
        type="submit"
        variant={checkpoint.aktif ? "destructive" : "outline"}
        size="sm"
      >
        {checkpoint.aktif ? "Nonaktifkan" : "Aktifkan"}
      </Button>
    </form>
  );
}

function CheckpointFormSheet({
  open,
  checkpoint,
  onClose,
  onSuccess,
}: {
  open: boolean;
  checkpoint: CheckpointRow | null;
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
          <SheetTitle>
            {checkpoint ? "Edit Checkpoint" : "Tambah Checkpoint"}
          </SheetTitle>
          <SheetDescription>
            Isi koordinat agar scan bisa diverifikasi terhadap radius titik.
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <CheckpointForm
            checkpoint={checkpoint}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function CheckpointForm({
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
          Kode Barcode{" "}
          <span className="normal-case">(opsional, otomatis bila kosong)</span>
        </label>
        <Input
          id="kodeBarcode"
          name="kodeBarcode"
          defaultValue={checkpoint?.kodeBarcode ?? ""}
          placeholder="SP-1A2B3C4D"
          aria-invalid={Boolean(state?.errors?.kodeBarcode)}
          className="mono-num"
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
            className="mono-num"
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
            className="mono-num"
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

function PrintLabel({
  checkpoint,
  onClose,
}: {
  checkpoint: CheckpointRow;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Label checkpoint ${checkpoint.namaTitik}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xs rounded-[var(--radius)] border border-border bg-card p-5">
        <div className="no-print mb-4 flex items-center justify-between gap-2">
          <h2 className="section-title">Label Checkpoint</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>

        <div className="print-area rounded-[var(--radius-sm)] bg-white p-5 text-center text-slate-900">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            SecurePatrol
          </p>
          <div
            className="qr-box mx-auto my-3 size-44"
            dangerouslySetInnerHTML={{ __html: checkpoint.qrSvg }}
          />
          <p className="text-base font-bold">{checkpoint.namaTitik}</p>
          <p className="mono-num mt-1 text-sm text-slate-600">
            {checkpoint.kodeBarcode}
          </p>
          {checkpoint.keterangan ? (
            <p className="mt-1 text-xs text-slate-500">
              {checkpoint.keterangan}
            </p>
          ) : null}
        </div>

        <Button className="mt-4 w-full" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden="true" />
          Cetak Label
        </Button>
      </div>
    </div>
  );
}
