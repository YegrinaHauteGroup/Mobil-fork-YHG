"use client";

import { useRef, useState } from "react";
import { useWorkspace, type TabKind } from "./workspace-context";

export function ImportItemButton({
  kind,
  label,
  accept,
  importAction,
}: {
  kind: TabKind;
  label: string;
  accept: string;
  importAction: (
    formData: FormData
  ) => Promise<{ id: string; title: string; seed: unknown } | { error: string }>;
}) {
  const { openTab } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await importAction(formData);
      if ("error" in res) setError(res.error);
      else openTab(kind, res.id, res.title, res.seed);
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="stack" style={{ gap: 6, alignItems: "flex-end" }}>
      <input ref={inputRef} type="file" accept={accept} hidden onChange={onChange} />
      <button type="button" className="btn btn-ghost" onClick={onPick} disabled={pending}>
        {pending ? "Importing…" : label}
      </button>
      {error && <div className="notice notice-error">{error}</div>}
    </div>
  );
}
