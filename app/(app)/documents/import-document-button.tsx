"use client";

import { useRef, useState } from "react";
import { useWorkspace } from "../workspace/workspace-context";
import { importDocument } from "./actions";

const ACCEPT = ".txt,.docx,.hwp,.hwpx";

export function ImportDocumentButton() {
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
      const res = await importDocument(formData);
      if ("error" in res) setError(res.error);
      else openTab("document", res.id, res.title);
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="stack" style={{ gap: 6, alignItems: "flex-end" }}>
      <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={onChange} />
      <button type="button" className="btn btn-ghost" onClick={onPick} disabled={pending}>
        {pending ? "Importing…" : "Import file"}
      </button>
      {error && <div className="notice notice-error">{error}</div>}
    </div>
  );
}
