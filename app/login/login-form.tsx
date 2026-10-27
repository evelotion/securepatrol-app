"use client";

import { useActionState } from "react";

import { login, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error ? (
        <p role="alert" className="alert-error">
          {state.error}
        </p>
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

      <Button type="submit" className="mt-1 w-full" disabled={pending}>
        {pending ? "Memeriksa…" : "Masuk"}
      </Button>
    </form>
  );
}
