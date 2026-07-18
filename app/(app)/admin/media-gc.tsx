"use client";

import { useState, useTransition } from "react";
import { formatBytes } from "@/lib/format";
import { listOrphanedMedia, deleteOrphanedMedia, type OrphanedMediaRow } from "./actions";

type ScanState =
  | { status: "idle" }
  | { status: "scanning" }
  | { status: "done"; rows: OrphanedMediaRow[] }
  | { status: "error"; message: string };

export function MediaGc() {
  const [scan, setScan] = useState<ScanState>({ status: "idle" });
  const [deleted, setDeleted] = useState<number | null>(null);
  const [pending, start] = useTransition();

  const runScan = () =>
    start(async () => {
      setDeleted(null);
      setScan({ status: "scanning" });
      const res = await listOrphanedMedia();
      if ("error" in res) setScan({ status: "error", message: res.error });
      else setScan({ status: "done", rows: res.rows });
    });

  const runDelete = () => {
    if (scan.status !== "done" || scan.rows.length === 0) return;
    start(async () => {
      const names = scan.rows.map((r) => r.name);
      const res = await deleteOrphanedMedia(names);
      if ("error" in res) {
        setScan({ status: "error", message: res.error });
        return;
      }
      setDeleted(res.removed);
      setScan({ status: "done", rows: [] });
    });
  };

  const totalBytes =
    scan.status === "done" ? scan.rows.reduce((s, r) => s + r.bytes, 0) : 0;

  return (
    <div>
      <p className="page-sub" style={{ margin: "0 0 12px" }}>
        Finds media-bucket uploads (document images/videos) no longer referenced by
        any document, then removes them from storage.
      </p>

      <div className="row" style={{ gap: 10, marginBottom: 14 }}>
        <button className="btn btn-sm" onClick={runScan} disabled={pending}>
          {scan.status === "scanning" ? "Scanning…" : "Scan for orphaned media"}
        </button>
        {scan.status === "done" && scan.rows.length > 0 && (
          <button className="btn btn-sm btn-danger" onClick={runDelete} disabled={pending}>
            {pending ? "Deleting…" : `Delete ${scan.rows.length} files (${formatBytes(totalBytes)})`}
          </button>
        )}
      </div>

      {scan.status === "error" && (
        <div className="notice notice-error">{scan.message}</div>
      )}
      {deleted !== null && (
        <div className="notice notice-ok" style={{ marginBottom: 12 }}>
          Removed {deleted} orphaned file{deleted === 1 ? "" : "s"}.
        </div>
      )}
      {scan.status === "done" && scan.rows.length === 0 && deleted === null && (
        <div className="empty">No orphaned media found.</div>
      )}
      {scan.status === "done" && scan.rows.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Path</th>
              <th style={{ width: 100 }}>Size</th>
              <th style={{ width: 180 }}>Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {scan.rows.map((r) => (
              <tr key={r.name}>
                <td className="mono" style={{ fontSize: 12, wordBreak: "break-all" }}>
                  {r.name}
                </td>
                <td className="mono muted">{formatBytes(r.bytes)}</td>
                <td className="mono muted" style={{ fontSize: 12 }}>
                  {new Date(r.created_at).toLocaleString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
