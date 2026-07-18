"use client";

import { useState, useTransition } from "react";
import { Copyable } from "@/components/copyable";
import { generateAdminCode } from "./actions";

const EXPIRY_OPTIONS = [
  { label: "Never", hours: 0 },
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
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
          <span className="label">Expiry</span>
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
          {pending ? "Issuing…" : "Issue code"}
        </button>
      </div>

      {code && (
        <div>
          <div className="notice notice-info">
            This code is shown only once and cannot be retrieved again — store it safely.
          </div>
          <Copyable value={code} label="ISSUED ADMIN CODE" />
        </div>
      )}
    </div>
  );
}
