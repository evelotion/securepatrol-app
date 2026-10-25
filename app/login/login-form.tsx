"use client";

import { useActionState } from "react";

import { login, type LoginState } from "@/app/actions/auth";

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
        <input
          className="input"
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
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      <button className="btn btn-primary mt-1 w-full" type="submit" disabled={pending}>
        {pending ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
