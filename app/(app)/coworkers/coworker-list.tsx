"use client";

import { useMemo, useState } from "react";

type Coworker = {
  id: string;
  display_name: string | null;
  email: string;
  role: string;
  gender: string | null;
  bio: string | null;
  avatar_url: string | null;
  age: number | null;
  address: string | null;
  phone: string | null;
};

export function CoworkerList({ coworkers }: { coworkers: Coworker[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coworkers;
    return coworkers.filter(
      (c) =>
        (c.display_name ?? "").toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.bio ?? "").toLowerCase().includes(q)
    );
  }, [coworkers, query]);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="label">
          PEOPLE ({filtered.length}
          {query ? ` / ${coworkers.length}` : ""})
        </span>
        <input
          className="input"
          style={{ width: 240, height: 30 }}
          placeholder="Search name, email or bio…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {coworkers.length === 0 ? (
        <div className="empty">No other co-workers yet.</div>
      ) : filtered.length === 0 ? (
        <div className="empty">No one matches “{query}”.</div>
      ) : (
        <div className="panel-body coworker-grid">
          {filtered.map((c) => {
            const name = c.display_name || c.email.split("@")[0];
            const initial = (name || "?").charAt(0).toUpperCase();
            return (
              <div key={c.id} className="panel coworker-card">
                <div className="row" style={{ gap: 12, alignItems: "center" }}>
                  {c.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.avatar_url}
                      alt={name}
                      width={48}
                      height={48}
                      style={{ borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-1)" }}
                    />
                  ) : (
                    <div className="avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
                      {initial}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "var(--text-0)", fontSize: 14, fontWeight: 500 }}>
                      {name}
                      {c.role === "admin" && (
                        <span className="badge badge-admin" style={{ marginLeft: 6 }}>
                          admin
                        </span>
                      )}
                    </div>
                    <div className="mono muted" style={{ fontSize: 11.5 }}>
                      {c.email}
                    </div>
                  </div>
                </div>

                <div className="coworker-fields">
                  {c.gender && (
                    <div className="coworker-field">
                      <span className="label">Gender</span>
                      <span>{c.gender}</span>
                    </div>
                  )}
                  {c.age != null && (
                    <div className="coworker-field">
                      <span className="label">Age</span>
                      <span>{c.age}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="coworker-field">
                      <span className="label">Phone</span>
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="coworker-field">
                      <span className="label">Address</span>
                      <span>{c.address}</span>
                    </div>
                  )}
                </div>

                {c.bio && <p className="coworker-bio">{c.bio}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
