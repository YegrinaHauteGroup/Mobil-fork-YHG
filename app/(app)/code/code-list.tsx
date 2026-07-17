"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDate } from "@/lib/format";

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
          placeholder="파일명·언어 검색…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {files.length === 0 ? (
        <div className="empty">코드 파일이 없습니다. “새 코드 파일”로 시작하세요.</div>
      ) : filtered.length === 0 ? (
        <div className="empty">“{query}” 와 일치하는 파일이 없습니다.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>파일명</th>
              <th style={{ width: 130 }}>언어</th>
              <th style={{ width: 90 }}>공개</th>
              <th style={{ width: 60 }}>소유</th>
              <th style={{ width: 180 }}>수정일</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="mono">
                  <Link href={`/code/${c.id}`}>{c.name}</Link>
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
                    {c.owner_id === userId ? "나" : "공유"}
                  </span>
                </td>
                <td className="mono muted" style={{ fontSize: 12 }}>
                  {formatDate(c.updated_at)}
                </td>
                <td>
                  <Link href={`/code/${c.id}`} className="btn btn-ghost btn-sm">
                    열기
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
