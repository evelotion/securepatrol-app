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
  Plus,
  Search,
  Users,
} from "lucide-react";

import { createUser, toggleUserAktif, updateUser } from "@/app/actions/users";
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
import type { FormState } from "@/lib/form";
import { ROLE_BADGE, ROLE_LABEL, ROLES } from "@/lib/roles";
import type { UserRow } from "@/lib/types";

const PER_HALAMAN = 8;

export function UsersClient({
  actorId,
  users,
}: {
  actorId: string;
  users: UserRow[];
}) {
  const [flash, setFlash] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"semua" | "aktif" | "nonaktif">(
    "semua",
  );
  const [halaman, setHalaman] = useState(1);

  const onSuccess = useCallback((message: string) => setFlash(message), []);
  const closeCreate = useCallback(() => setCreating(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  const q = query.trim().toLowerCase();
  const filtered = users.filter((user) => {
    const cocokQ =
      q === "" ||
      user.nama.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      (user.username ?? "").toLowerCase().includes(q);
    const cocokStatus =
      status === "semua" || (status === "aktif" ? user.aktif : !user.aktif);
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
            <h2 className="section-title">Daftar Akun</h2>
            <p className="text-xs text-muted-foreground">
              {users.filter((u) => u.aktif).length} aktif · {users.length} total
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
              placeholder="Cari nama, email, username…"
              aria-label="Cari user"
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "semua" | "aktif" | "nonaktif");
              setHalaman(1);
            }}
            aria-label="Filter status akun"
            className="sm:w-40"
          >
            <option value="semua">Semua status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
            <Users className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {users.length === 0
                ? "Belum ada user. Klik “Tambah” untuk memulai."
                : "Tidak ada akun yang cocok dengan pencarian."}
            </p>
          </div>
        ) : (
          <>
            {/* HP: kartu */}
            <ul className="mt-4 flex flex-col gap-2 md:hidden">
              {rows.map((user) => (
                <li
                  key={user.id}
                  className="rounded-[var(--radius-sm)] border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {user.nama}
                        {user.id === actorId ? (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            (Anda)
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <span
                      className={`badge shrink-0 ${
                        user.aktif ? "badge-green" : "badge-slate"
                      }`}
                    >
                      {user.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`badge ${ROLE_BADGE[user.role]}`}>
                      {ROLE_LABEL[user.role]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.regu ?? "Tanpa regu"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFlash(null);
                        setEditing(user);
                      }}
                    >
                      Edit
                    </Button>
                    <ToggleAktif user={user} actorId={actorId} />
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: tabel */}
            <div className="mt-4 hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email / Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Regu</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <p className="font-medium">{user.nama}</p>
                        {user.id === actorId ? (
                          <span className="text-xs text-muted-foreground">
                            Anda
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <p>{user.email}</p>
                        {user.username ? (
                          <p className="text-xs text-muted-foreground">
                            @{user.username}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <span className={`badge ${ROLE_BADGE[user.role]}`}>
                          {ROLE_LABEL[user.role]}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.regu ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`badge ${
                            user.aktif ? "badge-green" : "badge-slate"
                          }`}
                        >
                          {user.aktif ? "Aktif" : "Nonaktif"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFlash(null);
                              setEditing(user);
                            }}
                          >
                            Edit
                          </Button>
                          <ToggleAktif user={user} actorId={actorId} />
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
                {filtered.length} akun
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

      <UserFormSheet
        open={creating}
        user={null}
        onClose={closeCreate}
        onSuccess={onSuccess}
      />

      <UserFormSheet
        open={editing !== null}
        user={editing}
        onClose={closeEdit}
        onSuccess={onSuccess}
      />
    </>
  );
}

function ToggleAktif({ user, actorId }: { user: UserRow; actorId: string }) {
  return (
    <form action={toggleUserAktif} className="inline">
      <input type="hidden" name="id" value={user.id} />
      <Button
        type="submit"
        variant={user.aktif ? "destructive" : "outline"}
        size="sm"
        disabled={user.id === actorId && user.aktif}
        title={
          user.id === actorId && user.aktif
            ? "Tidak bisa menonaktifkan akun sendiri"
            : undefined
        }
      >
        {user.aktif ? "Nonaktifkan" : "Aktifkan"}
      </Button>
    </form>
  );
}

function UserFormSheet({
  open,
  user,
  onClose,
  onSuccess,
}: {
  open: boolean;
  user: UserRow | null;
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
          <SheetTitle>{user ? "Edit User" : "Tambah User"}</SheetTitle>
          <SheetDescription>
            {user
              ? "Kosongkan password bila tidak ingin menggantinya."
              : "Akun baru langsung bisa dipakai untuk masuk."}
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <UserForm user={user} onClose={onClose} onSuccess={onSuccess} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function UserForm({
  user,
  onClose,
  onSuccess,
}: {
  user: UserRow | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const action = user ? updateUser : createUser;
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
      {user ? <input type="hidden" name="id" value={user.id} /> : null}

      <div className="field">
        <label className="field-label" htmlFor="nama">
          Nama Lengkap
        </label>
        <Input
          id="nama"
          name="nama"
          defaultValue={user?.nama ?? ""}
          placeholder="Budi Santoso"
          aria-invalid={Boolean(state?.errors?.nama)}
          required
        />
        {error("nama")}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={user?.email ?? ""}
          placeholder="budi@securepatrol.id"
          aria-invalid={Boolean(state?.errors?.email)}
          required
        />
        {error("email")}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="username">
          Username <span className="normal-case">(opsional)</span>
        </label>
        <Input
          id="username"
          name="username"
          defaultValue={user?.username ?? ""}
          placeholder="budi"
          aria-invalid={Boolean(state?.errors?.username)}
        />
        {error("username")}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="field">
          <label className="field-label" htmlFor="role">
            Role
          </label>
          <Select
            id="role"
            name="role"
            defaultValue={user?.role ?? "SECURITY"}
            aria-invalid={Boolean(state?.errors?.role)}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </Select>
          {error("role")}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="regu">
            Regu <span className="normal-case">(opsional)</span>
          </label>
          <Input
            id="regu"
            name="regu"
            defaultValue={user?.regu ?? ""}
            placeholder="Regu A"
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="password">
          Password{" "}
          {user ? <span className="normal-case">(kosongkan bila tetap)</span> : null}
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder={user ? "••••••••" : "min. 8 karakter"}
          aria-invalid={Boolean(state?.errors?.password)}
          required={!user}
        />
        {error("password")}
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
