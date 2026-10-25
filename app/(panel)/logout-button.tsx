"use client";

import { useFormStatus } from "react-dom";

import { logout } from "@/app/actions/auth";

export function LogoutButton() {
  return (
    <form action={logout}>
      <LogoutSubmit />
    </form>
  );
}

function LogoutSubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="btn btn-ghost btn-sm w-full"
      disabled={pending}
      title="Keluar dari sesi"
    >
      {pending ? "…" : "Keluar"}
    </button>
  );
}
