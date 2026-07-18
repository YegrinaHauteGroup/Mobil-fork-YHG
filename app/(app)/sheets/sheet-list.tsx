"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import { OpenItemButton } from "../workspace/open-item-button";

type SheetRow = {
  id: string;
  owner_id: string;
  title: string;
  is_public: boolean;
  updated_at: string;
};

export function SheetList({ sheets, userId }: { sheets: SheetRow[]; userId: string }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sheets;
    return sheets.filter((s) => (s.title || "").toLowerCase().includes(q));
  }, [sheets, query]);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="label">
          SHEETS ({filtered.length}
          {query ? ` / ${sheets.length}` : ""})
        </span>
        <input
          className="input"
          style={{ width: 240, height: 30 }}
          placeholder="Search title…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {sheets.length === 0 ? (
        <div className="empty">No sheets yet. Use “New sheet” to start.</div>
      ) : filtered.length === 0 ? (
        <div className="empty">No sheets match “{query}”.</div>
      ) : (
        <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th style={{ width: 90 }}>Visibility</th>
              <th style={{ width: 60 }}>Owner</th>
              <th style={{ width: 180 }}>Updated</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>
                  <OpenItemButton kind="sheet" id={s.id} title={s.title || "Untitled sheet"} className="link-btn">
                    {s.title || "Untitled sheet"}
                  </OpenItemButton>
                </td>
                <td>
                  {s.is_public ? (
                    <span className="badge badge-ok">public</span>
                  ) : (
                    <span className="badge">private</span>
                  )}
                </td>
                <td>
                  <span className="badge">{s.owner_id === userId ? "Mine" : "Shared"}</span>
                </td>
                <td className="mono muted" style={{ fontSize: 12 }}>
                  {formatDate(s.updated_at)}
                </td>
                <td>
                  <OpenItemButton kind="sheet" id={s.id} title={s.title || "Untitled sheet"} className="btn btn-ghost btn-sm">
                    Open
                  </OpenItemButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
