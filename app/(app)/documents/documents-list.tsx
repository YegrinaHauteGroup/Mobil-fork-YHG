"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDate } from "@/lib/format";

type DocRow = {
  id: string;
  owner_id: string;
  title: string;
  is_public: boolean;
  updated_at: string;
};

export function DocumentsList({
  docs,
  userId,
}: {
  docs: DocRow[];
  userId: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => (d.title || "").toLowerCase().includes(q));
  }, [docs, query]);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="label">
          DOCUMENTS ({filtered.length}
          {query ? ` / ${docs.length}` : ""})
        </span>
        <input
          className="input"
          style={{ width: 240, height: 30 }}
          placeholder="Search title…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {docs.length === 0 ? (
        <div className="empty">No documents yet. Use “New document” to start.</div>
      ) : filtered.length === 0 ? (
        <div className="empty">No documents match “{query}”.</div>
      ) : (
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
            {filtered.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link href={`/documents/${d.id}`}>{d.title || "Untitled"}</Link>
                </td>
                <td>
                  {d.is_public ? (
                    <span className="badge badge-ok">public</span>
                  ) : (
                    <span className="badge">private</span>
                  )}
                </td>
                <td>
                  <span className="badge">
                    {d.owner_id === userId ? "Mine" : "Shared"}
                  </span>
                </td>
                <td className="mono muted" style={{ fontSize: 12 }}>
                  {formatDate(d.updated_at)}
                </td>
                <td>
                  <Link href={`/documents/${d.id}`} className="btn btn-ghost btn-sm">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
