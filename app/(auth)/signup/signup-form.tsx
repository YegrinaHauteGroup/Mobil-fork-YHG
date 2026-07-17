"use client";

import { useActionState } from "react";
import { signup, type SignupState } from "./actions";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(
    signup,
    null
  );

  if (state && "ok" in state && state.needsConfirmation) {
    return (
      <div className="notice notice-ok">
        A confirmation email was sent. Click the link to finish signing up,
        then sign in.
      </div>
    );
  }

  return (
    <form action={formAction}>
      {state && "error" in state && (
        <div className="notice notice-error">{state.error}</div>
      )}
      <div className="field">
        <label className="label" htmlFor="display_name">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          className="input"
          autoComplete="nickname"
          placeholder="Display name (optional)"
        />
      </div>
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={pending}
      >
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
