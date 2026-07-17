"use client";

import { useState, useTransition } from "react";
import { Copyable } from "@/components/copyable";
import { generateAdminCode } from "./actions";

const EXPIRY_OPTIONS = [
  { label: "무기한", hours: 0 },
  { label: "24시간", hours: 24 },
  { label: "7일", hours: 24 * 7 },
];

export function GenerateCode() {
  const [expiryHours, setExpiryHours] = useState(0);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const generate = () =>
    start(async () => {
      setError(null);
      setCode(null);
      const expiresAt =
        expiryHours > 0
          ? new Date(Date.now() + expiryHours * 3600_000).toISOString()
          : null;
      const res = await generateAdminCode(expiresAt);
      if ("code" in res) setCode(res.code);
      else setError(res.error);
    });

  return (
    <div>
      {error && <div className="notice notice-error">{error}</div>}

      <div className="row" style={{ gap: 8, marginBottom: 14 }}>
        <div className="stack" style={{ gap: 6 }}>
          <span className="label">만료</span>
          <select
            className="select"
            style={{ width: 140 }}
            value={expiryHours}
            onChange={(e) => setExpiryHours(Number(e.target.value))}
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.hours} value={o.hours}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-primary"
          onClick={generate}
          disabled={pending}
          style={{ alignSelf: "flex-end" }}
        >
          {pending ? "발급 중…" : "코드 발급"}
        </button>
      </div>

      {code && (
        <div>
          <div className="notice notice-info">
            이 코드는 지금 한 번만 표시됩니다. 재조회할 수 없으니 안전한 곳에
            보관하세요.
          </div>
          <Copyable value={code} label="ISSUED ADMIN CODE" />
        </div>
      )}
    </div>
  );
}
