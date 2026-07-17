"use client";

import { useState } from "react";

export function Copyable({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard 권한 없음 — 조용히 무시 */
    }
  };

  return (
    <div>
      {label && <div className="label" style={{ marginBottom: 6 }}>{label}</div>}
      <div className="row" style={{ gap: 8 }}>
        <code className="code-block grow">{value}</code>
        <button type="button" className="btn btn-sm" onClick={copy}>
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
    </div>
  );
}
