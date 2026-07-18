"use client";

import { useActionState, useState } from "react";
import { changePassword, type PasswordState } from "./actions";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(
    changePassword,
    null
  );
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const mismatch =
    newPasswordConfirm.length > 0 && newPassword !== newPasswordConfirm;

  return (
    <form
      action={formAction}
      key={state && "ok" in state ? "done" : "form"}
      onSubmit={() => {
        setNewPassword("");
        setNewPasswordConfirm("");
      }}
    >
      {state && "error" in state && (
        <div className="notice notice-error">{state.error}</div>
      )}
      {state && "ok" in state && (
        <div className="notice notice-ok">Password changed.</div>
      )}

      <div className="field">
        <label className="label" htmlFor="current_password">
          Current password
        </label>
        <input
          id="current_password"
          name="current_password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="new_password">
          New password
        </label>
        <input
          id="new_password"
          name="new_password"
          type="password"
          className="input"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="new_password_confirm">
          Confirm new password
        </label>
        <input
          id="new_password_confirm"
          name="new_password_confirm"
          type="password"
          className="input"
          autoComplete="new-password"
          placeholder="Re-enter new password"
          minLength={8}
          required
          value={newPasswordConfirm}
          onChange={(e) => setNewPasswordConfirm(e.target.value)}
        />
        {mismatch && (
          <span style={{ fontSize: 12.5, color: "var(--accent, #e7a79d)" }}>
            Passwords do not match.
          </span>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={pending || mismatch}
      >
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
