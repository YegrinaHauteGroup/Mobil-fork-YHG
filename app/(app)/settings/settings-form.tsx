"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, type SettingsState } from "./actions";

export function SettingsForm({
  initialName,
  initialGender,
  initialBio,
  initialAge,
  initialAddress,
  initialPhone,
  initialAgePublic,
  initialAddressPublic,
  initialPhonePublic,
}: {
  initialName: string;
  initialGender: string;
  initialBio: string;
  initialAge: number | null;
  initialAddress: string;
  initialPhone: string;
  initialAgePublic: boolean;
  initialAddressPublic: boolean;
  initialPhonePublic: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateProfile,
    null
  );

  // 저장 성공 시 서버 컴포넌트(헤더의 이름/아바타, 동료 목록 등)를 새로고침해
  // 변경 사항이 즉시 반영되게 한다.
  useEffect(() => {
    if (state && "ok" in state) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction}>
      {state && "error" in state && (
        <div className="notice notice-error">{state.error}</div>
      )}
      {state && "ok" in state && (
        <div className="notice notice-ok">Saved.</div>
      )}

      <p className="page-sub" style={{ margin: "0 0 14px" }}>
        Every field is required. Name, gender, email and bio are always visible
        to co-workers; age, address and phone are private unless you choose to
        show them.
      </p>

      <div className="field">
        <label className="label" htmlFor="display_name">
          Name <span className="badge">public</span>
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          className="input"
          defaultValue={initialName}
          placeholder="Your name"
          maxLength={80}
          required
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="gender">
          Gender <span className="badge">public</span>
        </label>
        <input
          id="gender"
          name="gender"
          type="text"
          className="input"
          defaultValue={initialGender}
          placeholder="e.g. male, female, non-binary"
          maxLength={40}
          required
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="bio">
          Bio <span className="badge">public</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          className="input"
          style={{ height: 90, resize: "vertical", paddingTop: 8 }}
          defaultValue={initialBio}
          placeholder="A short introduction"
          maxLength={500}
          required
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="age">
          Age
        </label>
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <input
            id="age"
            name="age"
            type="number"
            className="input"
            style={{ width: 100 }}
            defaultValue={initialAge ?? ""}
            min={0}
            max={150}
            required
          />
          <label className="row" style={{ gap: 6, fontSize: 12.5, color: "var(--text-2)" }}>
            <input type="checkbox" name="age_public" defaultChecked={initialAgePublic} />
            Show to co-workers
          </label>
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="address">
          Address
        </label>
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <input
            id="address"
            name="address"
            type="text"
            className="input"
            defaultValue={initialAddress}
            maxLength={300}
            required
          />
        </div>
        <label className="row" style={{ gap: 6, fontSize: 12.5, color: "var(--text-2)", marginTop: 6 }}>
          <input type="checkbox" name="address_public" defaultChecked={initialAddressPublic} />
          Show to co-workers
        </label>
      </div>

      <div className="field">
        <label className="label" htmlFor="phone">
          Phone
        </label>
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="input"
            defaultValue={initialPhone}
            maxLength={40}
            required
          />
        </div>
        <label className="row" style={{ gap: 6, fontSize: 12.5, color: "var(--text-2)", marginTop: 6 }}>
          <input type="checkbox" name="phone_public" defaultChecked={initialPhonePublic} />
          Show to co-workers
        </label>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
