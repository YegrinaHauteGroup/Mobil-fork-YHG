"use client";

import { useState } from "react";
import { useWorkspace, type TabKind } from "./workspace-context";

export function NewItemButton({
  kind,
  label,
  create,
}: {
  kind: TabKind;
  label: string;
  create: () => Promise<{ id: string; title: string }>;
}) {
  const { openTab } = useWorkspace();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const { id, title } = await create();
      openTab(kind, id, title);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create — please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="row" style={{ flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <button type="button" className="btn btn-primary" onClick={onClick} disabled={pending}>
        {pending ? "Creating…" : label}
      </button>
      {error && <div className="notice notice-error">{error}</div>}
    </div>
  );
}
