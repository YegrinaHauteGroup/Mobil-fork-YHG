"use client";

import { useMemo, useState } from "react";
import { formatBytes, formatDate } from "@/lib/format";

type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
  documents_count: number;
  files_count: number;
  code_count: number;
  sheets_count: number;
  maps_count: number;
  storage_bytes: number;
};

export function UserTable({ users }: { users: UserRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.display_name ?? "").toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="label">
          USERS ({filtered.length}
          {query ? ` / ${users.length}` : ""})
        </span>
        <input
          className="input"
          style={{ width: 240, height: 30 }}
          placeholder="Search email or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {users.length === 0 ? (
        <div className="empty">No users.</div>
      ) : filtered.length === 0 ? (
        <div className="empty">No users match “{query}”.</div>
      ) : (
        <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th className="col-hide-mobile">Name</th>
              <th style={{ width: 80 }}>Role</th>
              <th style={{ width: 60 }} className="col-hide-mobile">Docs +</th>
              <th style={{ width: 60 }} className="col-hide-mobile">Repo</th>
              <th style={{ width: 60 }} className="col-hide-mobile">Code</th>
              <th style={{ width: 60 }} className="col-hide-mobile">Table</th>
              <th style={{ width: 60 }} className="col-hide-mobile">Graph</th>
              <th style={{ width: 100 }}>Storage</th>
              <th style={{ width: 160 }} className="col-hide-mobile">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td className="mono" style={{ fontSize: 12 }}>
                  {u.email}
                </td>
                <td className="col-hide-mobile">{u.display_name || "—"}</td>
                <td>
                  {u.role === "admin" ? (
                    <span className="badge badge-admin">admin</span>
                  ) : (
                    <span className="badge">user</span>
                  )}
                </td>
                <td className="mono muted col-hide-mobile">{u.documents_count}</td>
                <td className="mono muted col-hide-mobile">{u.files_count}</td>
                <td className="mono muted col-hide-mobile">{u.code_count}</td>
                <td className="mono muted col-hide-mobile">{u.sheets_count}</td>
                <td className="mono muted col-hide-mobile">{u.maps_count}</td>
                <td className="mono muted">{formatBytes(u.storage_bytes)}</td>
                <td className="mono muted col-hide-mobile" style={{ fontSize: 12 }}>
                  {formatDate(u.created_at)}
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
