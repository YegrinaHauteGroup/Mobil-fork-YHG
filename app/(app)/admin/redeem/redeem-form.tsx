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
          관리자 권한이 부여되었습니다. 이제 관리자 콘솔을 사용할 수 있습니다.
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            router.push("/admin");
            router.refresh();
          }}
        >
          관리자 콘솔로 이동
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
          placeholder="관리자 코드를 입력"
          autoComplete="off"
          required
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "확인 중…" : "권한 승격"}
      </button>
    </form>
  );
}
