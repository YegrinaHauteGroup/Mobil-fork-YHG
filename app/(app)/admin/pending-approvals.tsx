"use client";

import { useState, useTransition } from "react";
import { formatDate } from "@/lib/format";
import { approveUser, rejectUser, type PendingUserRow } from "./actions";

export function PendingApprovals({ initialUsers }: { initialUsers: PendingUserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const decide = (userId: string, action: "approve" | "reject") => {
    setBusyId(userId);
    setError(null);
    start(async () => {
      const res = action === "approve" ? await approveUser(userId) : await rejectUser(userId);
      if ("error" in res) setError(res.error);
      else setUsers((prev) => prev.filter((u) => u.id !== userId));
      setBusyId(null);
    });
  };

  return (
    <div>
      {error && <div className="notice notice-error">{error}</div>}
      {users.length === 0 ? (
        <div className="empty">No accounts waiting for approval.</div>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th className="col-hide-mobile">Name</th>
                <th style={{ width: 160 }} className="col-hide-mobile">Signed up</th>
                <th style={{ width: 180 }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="mono" style={{ fontSize: 12 }}>{u.email}</td>
                  <td className="col-hide-mobile">{u.display_name || "—"}</td>
                  <td className="mono muted col-hide-mobile" style={{ fontSize: 12 }}>
                    {formatDate(u.created_at)}
                  </td>
                  <td>
                    <div className="row row-actions" style={{ gap: 4 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => decide(u.id, "approve")}
                        disabled={pending && busyId === u.id}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-ghost btn-sm btn-danger"
                        onClick={() => decide(u.id, "reject")}
                        disabled={pending && busyId === u.id}
                      >
                        Reject
                      </button>
                    </div>
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
