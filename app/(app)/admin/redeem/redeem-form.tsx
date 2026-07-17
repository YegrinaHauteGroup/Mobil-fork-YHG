"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { redeemCode, type RedeemState } from "./actions";

export function RedeemForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<RedeemState, FormData>(
    redeemCode,
    null
  );

  if (state && "ok" in state) {
    return (
      <div>
        <div className="notice notice-ok">
          Admin privileges granted. You can now use the admin console.
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            router.push("/admin");
            router.refresh();
          }}
        >
          Go to admin console
        </button>
      </div>
    );
  }

  return (
    <form action={formAction}>
      {state && "error" in state && (
        <div className="notice notice-error">{state.error}</div>
      )}
      <div className="field">
        <label className="label" htmlFor="code">
          Admin Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          className="input mono"
          placeholder="Enter admin code"
          autoComplete="off"
          required
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Checking…" : "Elevate"}
      </button>
    </form>
  );
}
