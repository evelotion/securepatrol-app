"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

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
    <Button
      type="submit"
      variant="outline"
      size="sm"
      className="w-full justify-start"
      disabled={pending}
      title="Keluar dari sesi"
    >
      {pending ? "…" : "Keluar"}
    </Button>
  );
}
