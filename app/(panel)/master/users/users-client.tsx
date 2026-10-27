"use client";

import { useCallback, useEffect, useState, useActionState } from "react";

import { createUser, toggleUserAktif, updateUser } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">Daftar Akun</h2>
          <Button
            size="sm"
            onClick={() => {
              setFlash(null);
              setCreating(true);
            }}
          >
            Tambah User
          </Button>
        </div>

        <div className="glass-inset overflow-hidden rounded-lg">
          <Table className="min-w-[52rem]">
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
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada user. Klik “Tambah User” untuk memulai.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium">
                        {user.nama}
                      </p>
                      {user.id === actorId ? (
                        <span className="text-xs text-muted-foreground">Anda</span>
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
                    <TableCell>{user.regu ?? "—"}</TableCell>
                    <TableCell>
                      <span
                        className={`badge ${user.aktif ? "badge-green" : "badge-slate"}`}
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
                        <form
                          action={toggleUserAktif}
                          className="inline"
                        >
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
        <UserFormModal
          user={null}
          onClose={closeCreate}
          onSuccess={onSuccess}
        />
      ) : null}

      {editing ? (
        <UserFormModal
          user={editing}
          onClose={closeEdit}
          onSuccess={onSuccess}
        />
      ) : null}
    </>
  );
}

function UserFormModal({
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
            {user ? "Edit User" : "Tambah User"}
          </h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>

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
              Password {user ? <span className="normal-case">(kosongkan bila tetap)</span> : null}
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
