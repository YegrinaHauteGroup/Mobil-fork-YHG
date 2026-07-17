"use client";

import { useActionState } from "react";
import { login, type AuthState } from "./actions";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    login,
    null
  );

  return (
    <form action={formAction}>
      {state?.error && <div className="notice notice-error">{state.error}</div>}
      <input type="hidden" name="redirect" value={redirectTo || "/dashboard"} />
      <div className="field">
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
