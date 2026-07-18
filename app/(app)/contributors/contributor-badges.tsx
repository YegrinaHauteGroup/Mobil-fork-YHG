"use client";

import { useEffect, useState } from "react";
import { listContributors, type ContributorRow } from "./actions";

export function ContributorBadges({
  kind,
  id,
  refreshToken,
}: {
  kind: "document" | "code" | "sheet" | "mindmap";
  id: string;
  refreshToken?: unknown;
}) {
  const [contributors, setContributors] = useState<ContributorRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    listContributors(kind, id).then((rows) => {
      if (!cancelled) setContributors(rows);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, id, refreshToken]);

  if (contributors.length === 0) return null;

  return (
    <div className="contributor-row" title="Contributors">
      {contributors.map((c) => {
        const name = c.display_name || c.email.split("@")[0];
        const initial = (name || "?").charAt(0).toUpperCase();
        return (
          <span
            key={c.user_id}
            className="contributor-badge"
            title={`Contributor: ${name}`}
          >
            {c.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.avatar_url} alt={name} className="contributor-avatar" />
            ) : (
              <span className="contributor-avatar contributor-avatar-fallback">
                {initial}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
