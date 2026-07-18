"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import { OpenItemButton } from "../workspace/open-item-button";

type CodeRow = {
  id: string;
  owner_id: string;
  name: string;
  language: string;
  is_public: boolean;
  updated_at: string;
};

export function CodeList({ files, userId }: { files: CodeRow[]; userId: string }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.language.toLowerCase().includes(q)
    );
  }, [files, query]);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="label">
          CODE FILES ({filtered.length}
          {query ? ` / ${files.length}` : ""})
        </span>
        <input
          className="input"
          style={{ width: 240, height: 30 }}
          placeholder="Search filename or language…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {files.length === 0 ? (
        <div className="empty">No code files yet. Use “New code file” to start.</div>
      ) : filtered.length === 0 ? (
        <div className="empty">No files match “{query}”.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Filename</th>
              <th style={{ width: 130 }}>Language</th>
              <th style={{ width: 90 }}>Visibility</th>
              <th style={{ width: 60 }}>Owner</th>
              <th style={{ width: 180 }}>Updated</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="mono">
                  <OpenItemButton kind="code" id={c.id} title={c.name} className="link-btn">
                    {c.name}
                  </OpenItemButton>
                </td>
                <td className="mono muted" style={{ fontSize: 12 }}>
                  {c.language}
                </td>
                <td>
                  {c.is_public ? (
                    <span className="badge badge-ok">public</span>
                  ) : (
                    <span className="badge">private</span>
                  )}
                </td>
                <td>
                  <span className="badge">
                    {c.owner_id === userId ? "Mine" : "Shared"}
                  </span>
                </td>
                <td className="mono muted" style={{ fontSize: 12 }}>
                  {formatDate(c.updated_at)}
                </td>
                <td>
                  <OpenItemButton kind="code" id={c.id} title={c.name} className="btn btn-ghost btn-sm">
                    Open
                  </OpenItemButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
