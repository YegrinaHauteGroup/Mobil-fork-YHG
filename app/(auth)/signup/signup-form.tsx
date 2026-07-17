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
        확인 메일을 발송했습니다. 메일함의 링크를 눌러 가입을 완료한 뒤
        로그인하세요.
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
          placeholder="표시할 이름 (선택)"
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
          placeholder="8자 이상"
          minLength={8}
          required
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={pending}
      >
        {pending ? "생성 중…" : "계정 만들기"}
      </button>
    </form>
  );
}
