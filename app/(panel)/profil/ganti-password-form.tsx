"use client";

import { useActionState } from "react";

import { KeyRound } from "lucide-react";

import { gantiPassword } from "@/app/actions/akun";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/form";

export function GantiPasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    gantiPassword,
    undefined,
  );
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      {state?.message ? (
        <p role="status" className="alert-success">
          {state.message}
        </p>
      ) : null}

      {(
        [
          ["lama", "Password lama", "current-password"],
          ["baru", "Password baru", "new-password"],
          ["konfirmasi", "Ulangi password baru", "new-password"],
        ] as const
      ).map(([name, label, autoComplete]) => (
        <div key={name} className="field">
          <label className="field-label" htmlFor={`pw-${name}`}>
            {label}
          </label>
          <Input
            id={`pw-${name}`}
            name={name}
            type="password"
            autoComplete={autoComplete}
            required
            aria-invalid={errors[name] ? true : undefined}
          />
          {errors[name] ? <p className="field-error">{errors[name]}</p> : null}
        </div>
      ))}

      <Button type="submit" className="w-full" disabled={pending}>
        <KeyRound className="size-4" aria-hidden="true" />
        {pending ? "Menyimpan…" : "Ganti Password"}
      </Button>
    </form>
  );
}
