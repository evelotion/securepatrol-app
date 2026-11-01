"use client";

import { useFormStatus } from "react-dom";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

import { logout } from "@/app/actions/auth";

export function LogoutButton() {
  // F1-2: minta service worker menghapus semua cache saat logout,
  // supaya data user (dashboard, selfie base64) tidak tersisa di perangkat.
  const bersihkanCache = () => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.active?.postMessage({ type: "CLEAR" }))
      .catch(() => undefined);
  };

  return (
    <form action={logout} onSubmit={bersihkanCache} className="mt-4">
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
      className="w-full justify-start"
      disabled={pending}
      title="Keluar dari sesi"
    >
      <LogOut className="size-4" aria-hidden="true" />
      {pending ? "Keluar…" : "Keluar dari akun"}
    </Button>
  );
}
