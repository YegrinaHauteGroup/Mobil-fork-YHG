"use client";

import { useState, useTransition } from "react";
import { toggleStar, type StarKind } from "./starred-actions";
import "./star-button.css";

export function StarButton({
  kind,
  id,
  initialStarred,
  onChange,
}: {
  kind: StarKind;
  id: string;
  initialStarred: boolean;
  onChange?: (starred: boolean) => void;
}) {
  const [starred, setStarred] = useState(initialStarred);
  const [pending, start] = useTransition();

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = !starred;
    setStarred(next); // 낙관적 업데이트 — 실패하면 아래서 되돌린다.
    start(async () => {
      const res = await toggleStar(kind, id, next);
      if ("error" in res) {
        setStarred(!next);
        return;
      }
      setStarred(res.starred);
      onChange?.(res.starred);
    });
  };

  return (
    <button
      type="button"
      className={`star-btn ${starred ? "starred" : ""}`}
      onClick={toggle}
      disabled={pending}
      aria-label={starred ? "Unstar" : "Star"}
      aria-pressed={starred}
      title={starred ? "Unstar" : "Star"}
    >
      {starred ? "★" : "☆"}
    </button>
  );
}
