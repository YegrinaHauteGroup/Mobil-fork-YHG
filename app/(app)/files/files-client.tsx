"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatBytes, formatDate } from "@/lib/format";
import { ShareDialog } from "@/components/share-dialog";
import {
  deleteFile,
  getSignedUrl,
  shareFile,
  revokeFileShare,
  listFileShares,
} from "./actions";

type FileRow = {
  id: string;
  owner_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  is_public: boolean;
  created_at: string;
};

const BUCKET = "files";

export function FilesClient({
  initialFiles,
  userId,
}: {
  initialFiles: FileRow[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<FileRow | null>(null);
  const [pending, start] = useTransition();

  const onPick = () => inputRef.current?.click();

  const onFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);

    try {
      for (const file of Array.from(fileList)) {
        const fileId = crypto.randomUUID();
        const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
        const path = `${userId}/${fileId}/${safeName}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            contentType: file.type || undefined,
            upsert: false,
          });
        if (upErr) throw new Error(`업로드 실패: ${file.name}`);

        const { error: metaErr } = await supabase.from("files").insert({
          id: fileId,
          owner_id: userId,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
        });

        if (metaErr) {
          // 메타데이터 기록 실패 시 업로드된 객체를 정리한다 (고아 방지).
          await supabase.storage.from(BUCKET).remove([path]);
          throw new Error(`메타데이터 기록 실패: ${file.name}`);
        }

        await supabase.from("audit_logs").insert({
          user_id: userId,
          target_type: "file",
          target_id: fileId,
          action: "create",
        });
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const download = (id: string) =>
    start(async () => {
      const res = await getSignedUrl(id);
      if ("url" in res) {
        window.location.href = res.url;
      } else {
        setError(res.error);
      }
    });

  const remove = (row: FileRow) =>
    start(async () => {
      if (!confirm(`"${row.file_name}" 을(를) 삭제할까요? 되돌릴 수 없습니다.`))
        return;
      const res = await deleteFile(row.id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-h">파일 저장소</h1>
          <p className="page-sub">
            본인 소유 및 공유받은 파일. 업로드 경로는 {"{uid}/{file_id}/{name}"}{" "}
            규칙을 따릅니다.
          </p>
        </div>
        <div className="row">
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
          <button
            className="btn btn-primary"
            onClick={onPick}
            disabled={uploading}
          >
            {uploading ? "업로드 중…" : "파일 업로드"}
          </button>
        </div>
      </div>

      {error && <div className="notice notice-error">{error}</div>}

      <div className="panel">
        <div className="panel-header">
          <span className="label">FILES ({initialFiles.length})</span>
        </div>
        {initialFiles.length === 0 ? (
          <div className="empty">
            저장된 파일이 없습니다. 위의 “파일 업로드”로 시작하세요.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>이름</th>
                <th style={{ width: 120 }}>유형</th>
                <th style={{ width: 100 }}>크기</th>
                <th style={{ width: 160 }}>업로드</th>
                <th style={{ width: 60 }}>소유</th>
                <th style={{ width: 210 }}></th>
              </tr>
            </thead>
            <tbody>
              {initialFiles.map((f) => {
                const owned = f.owner_id === userId;
                return (
                  <tr key={f.id}>
                    <td>{f.file_name}</td>
                    <td className="mono muted" style={{ fontSize: 12 }}>
                      {f.mime_type || "—"}
                    </td>
                    <td className="mono muted">{formatBytes(f.size_bytes)}</td>
                    <td className="mono muted" style={{ fontSize: 12 }}>
                      {formatDate(f.created_at)}
                    </td>
                    <td>
                      <span className="badge">{owned ? "나" : "공유"}</span>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => download(f.id)}
                          disabled={pending}
                        >
                          다운로드
                        </button>
                        {owned && (
                          <>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setShareTarget(f)}
                            >
                              공유
                            </button>
                            <button
                              className="btn btn-ghost btn-sm btn-danger"
                              onClick={() => remove(f)}
                              disabled={pending}
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {shareTarget && (
        <ShareDialog
          targetLabel={shareTarget.file_name}
          myShareId={userId}
          loadShares={() => listFileShares(shareTarget.id)}
          onShare={(rid, perm) => shareFile(shareTarget.id, rid, perm)}
          onRevoke={(pid) => revokeFileShare(pid)}
          onClose={() => setShareTarget(null)}
        />
      )}
    </>
  );
}
