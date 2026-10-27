"use client";

import { useFormStatus } from "react-dom";

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
    <form action={logout} onSubmit={bersihkanCache}>
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
