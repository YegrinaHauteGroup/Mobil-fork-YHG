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
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th style={{ width: 80 }}>Role</th>
              <th style={{ width: 60 }}>Docs</th>
              <th style={{ width: 60 }}>Files</th>
              <th style={{ width: 60 }}>Code</th>
              <th style={{ width: 60 }}>Sheets</th>
              <th style={{ width: 60 }}>Maps</th>
              <th style={{ width: 100 }}>Storage</th>
              <th style={{ width: 160 }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td className="mono" style={{ fontSize: 12 }}>
                  {u.email}
                </td>
                <td>{u.display_name || "—"}</td>
                <td>
                  {u.role === "admin" ? (
                    <span className="badge badge-admin">admin</span>
                  ) : (
                    <span className="badge">user</span>
                  )}
                </td>
                <td className="mono muted">{u.documents_count}</td>
                <td className="mono muted">{u.files_count}</td>
                <td className="mono muted">{u.code_count}</td>
                <td className="mono muted">{u.sheets_count}</td>
                <td className="mono muted">{u.maps_count}</td>
                <td className="mono muted">{formatBytes(u.storage_bytes)}</td>
                <td className="mono muted" style={{ fontSize: 12 }}>
                  {formatDate(u.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
