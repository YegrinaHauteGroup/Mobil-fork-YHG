"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { Copyable } from "./copyable";

export type Share = {
  id: string;
  user_id: string;
  permission: "view" | "edit";
  granted_at: string;
};

type Result = { ok: true } | { ok: false; error: string };

export function ShareDialog({
  targetLabel,
  myShareId,
  loadShares,
  onShare,
  onRevoke,
  onClose,
}: {
  targetLabel: string;
  myShareId: string;
  loadShares: () => Promise<Share[]>;
  onShare: (recipientId: string, permission: "view" | "edit") => Promise<Result>;
  onRevoke: (permissionId: string) => Promise<Result>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [shares, setShares] = useState<Share[]>([]);
  const [recipient, setRecipient] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const refresh = () => loadShares().then(setShares);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    setError(null);
    start(async () => {
      const res = await onShare(recipient, permission);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRecipient("");
      await refresh();
      router.refresh();
    });
  };

  const revoke = (id: string) => {
    start(async () => {
      const res = await onRevoke(id);
      if (res.ok) {
        await refresh();
        router.refresh();
      }
    });
  };

  return (
    <Modal title={`Share — ${targetLabel}`} onClose={onClose} width={520}>
      {error && <div className="notice notice-error">{error}</div>}

      <div style={{ marginBottom: 18 }}>
        <Copyable value={myShareId} label="My Share ID (give to the other user)" />
      </div>

      <div className="label" style={{ marginBottom: 6 }}>
        Grant access to a user
      </div>
      <div className="row" style={{ gap: 8, alignItems: "stretch" }}>
        <input
          className="input grow"
          placeholder="Recipient's Share ID (UUID)"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <select
          className="select"
          style={{ width: 110 }}
          value={permission}
          onChange={(e) => setPermission(e.target.value as "view" | "edit")}
        >
          <option value="view">View</option>
          <option value="edit">Edit</option>
        </select>
        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={pending || !recipient.trim()}
        >
          Grant
        </button>
      </div>

      <div className="label" style={{ margin: "20px 0 8px" }}>
        Shared with ({shares.length})
      </div>
      {shares.length === 0 ? (
        <div className="empty" style={{ padding: "20px 0" }}>
          Not shared with anyone yet.
        </div>
      ) : (
        <table className="table">
          <tbody>
            {shares.map((s) => (
              <tr key={s.id}>
                <td className="mono" style={{ fontSize: 12 }}>
                  {s.user_id}
                </td>
                <td style={{ width: 70 }}>
                  <span className="badge">
                    {s.permission === "edit" ? "Edit" : "View"}
                  </span>
                </td>
                <td style={{ width: 60 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => revoke(s.id)}
                    disabled={pending}
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
