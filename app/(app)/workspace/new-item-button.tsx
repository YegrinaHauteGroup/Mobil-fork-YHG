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

  const onClick = async () => {
    if (pending) return;
    setPending(true);
    try {
      const { id, title } = await create();
      openTab(kind, id, title);
    } finally {
      setPending(false);
    }
  };

  return (
    <button type="button" className="btn btn-primary" onClick={onClick} disabled={pending}>
      {pending ? "Creating…" : label}
    </button>
  );
}
