"use client";

import { useActionState } from "react";

import { AlertTriangle } from "lucide-react";

import { login, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  const dibatasi = state?.error?.startsWith("Terlalu banyak percobaan");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error ? (
        <div
          role="alert"
          className={`flex items-start gap-2 ${
            dibatasi ? "alert-warn" : "alert-error"
          }`}
        >
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">
              {dibatasi ? "Percobaan masuk dibatasi" : "Gagal masuk"}
            </p>
            <p className="mt-0.5 font-normal">{state.error}</p>
          </div>
        </div>
      ) : null}

      <div className="field">
        <label className="field-label" htmlFor="identifier">
          Email / Username
        </label>
        <Input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          placeholder="admin@securepatrol.id"
          required
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
        {pending ? "Memeriksa…" : "Masuk"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Maksimal 5 percobaan gagal per 15 menit.
      </p>
    </form>
  );
}
