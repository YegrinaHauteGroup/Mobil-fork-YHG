"use client";

import { useActionState } from "react";
import { updateDisplayName, type SettingsState } from "./actions";

export function SettingsForm({ initialName }: { initialName: string }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateDisplayName,
    null
  );

  return (
    <form action={formAction}>
      {state && "error" in state && (
        <div className="notice notice-error">{state.error}</div>
      )}
      {state && "ok" in state && (
        <div className="notice notice-ok">Saved.</div>
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
          defaultValue={initialName}
          placeholder="Your name"
          maxLength={80}
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
