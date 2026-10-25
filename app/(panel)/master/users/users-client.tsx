"use client";

import { useCallback, useEffect, useState, useActionState } from "react";

import { createUser, toggleUserAktif, updateUser } from "@/app/actions/users";
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

      <section className="glass rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">Daftar Akun</h2>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setFlash(null);
              setCreating(true);
            }}
          >
            + Tambah User
          </button>
        </div>

        <div className="table-wrap glass-inset">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email / Username</th>
                <th>Role</th>
                <th>Regu</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Belum ada user. Klik “Tambah User” untuk memulai.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <p className="font-semibold text-slate-800">
                        {user.nama}
                      </p>
                      {user.id === actorId ? (
                        <span className="text-xs text-slate-400">Anda</span>
                      ) : null}
                    </td>
                    <td>
                      <p className="text-slate-700">{user.email}</p>
                      {user.username ? (
                        <p className="text-xs text-slate-400">
                          @{user.username}
                        </p>
                      ) : null}
                    </td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[user.role]}`}>
                        {ROLE_LABEL[user.role]}
                      </span>
                    </td>
                    <td>{user.regu ?? "—"}</td>
                    <td>
                      <span
                        className={`badge ${user.aktif ? "badge-green" : "badge-slate"}`}
                      >
                        {user.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setFlash(null);
                            setEditing(user);
                          }}
                        >
                          Edit
                        </button>
                        <form
                          action={toggleUserAktif}
                          className="inline"
                        >
                          <input type="hidden" name="id" value={user.id} />
                          <button
                            type="submit"
                            className={`btn btn-sm ${user.aktif ? "btn-danger" : "btn-ghost"}`}
                            disabled={user.id === actorId && user.aktif}
                            title={
                              user.id === actorId && user.aktif
                                ? "Tidak bisa menonaktifkan akun sendiri"
                                : undefined
                            }
                          >
                            {user.aktif ? "Nonaktifkan" : "Aktifkan"}
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
      <div className="glass-strong max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="section-title">
            {user ? "Edit User" : "Tambah User"}
          </h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          {user ? <input type="hidden" name="id" value={user.id} /> : null}

          <div className="field">
            <label className="field-label" htmlFor="nama">
              Nama Lengkap
            </label>
            <input
              className="input"
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
            <input
              className="input"
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
            <input
              className="input"
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
              <select
                className="select"
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
              </select>
              {error("role")}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="regu">
                Regu <span className="normal-case">(opsional)</span>
              </label>
              <input
                className="input"
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
            <input
              className="input"
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
