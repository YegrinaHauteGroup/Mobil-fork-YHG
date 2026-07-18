"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBytes, formatDate } from "@/lib/format";
import { deleteUser } from "../actions";

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

export function UserTable({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = (user: UserRow) => {
    if (
      !window.confirm(
        `Delete ${user.email}? This permanently removes the account and all of its content.`
      )
    ) {
      return;
    }
    setError(null);
    setPendingId(user.id);
    startTransition(async () => {
      const result = await deleteUser(user.id);
      setPendingId(null);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

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
      {error && <div className="notice notice-error">{error}</div>}
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
              <th style={{ width: 70 }} />
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
                <td>
                  {u.id !== currentUserId && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={isPending && pendingId === u.id}
                      onClick={() => handleDelete(u)}
                    >
                      {isPending && pendingId === u.id ? "Deleting…" : "Delete"}
                    </button>
                  )}
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
