import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createDocument } from "./actions";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const { userId } = await requireUser();
  const supabase = await createClient();

  const { data: docs } = await supabase
    .from("documents")
    .select("id, owner_id, title, is_public, updated_at")
    .order("updated_at", { ascending: false });

  const list = docs ?? [];

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">문서</span>
        <span className="crumb">WORKSPACE / DOCUMENTS</span>
      </div>
      <div className="content">
        <div className="page-head">
          <div>
            <h1 className="page-h">문서</h1>
            <p className="page-sub">
              본인 소유 및 공유받은 문서. 콘텐츠는 구조화된 JSON 으로 저장됩니다.
            </p>
          </div>
          <form action={createDocument}>
            <button type="submit" className="btn btn-primary">
              새 문서
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="label">DOCUMENTS ({list.length})</span>
          </div>
          {list.length === 0 ? (
            <div className="empty">
              문서가 없습니다. “새 문서”로 첫 문서를 작성하세요.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>제목</th>
                  <th style={{ width: 90 }}>공개</th>
                  <th style={{ width: 60 }}>소유</th>
                  <th style={{ width: 180 }}>수정일</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link href={`/documents/${d.id}`}>
                        {d.title || "Untitled"}
                      </Link>
                    </td>
                    <td>
                      {d.is_public ? (
                        <span className="badge badge-ok">public</span>
                      ) : (
                        <span className="badge">private</span>
                      )}
                    </td>
                    <td>
                      <span className="badge">
                        {d.owner_id === userId ? "나" : "공유"}
                      </span>
                    </td>
                    <td className="mono muted" style={{ fontSize: 12 }}>
                      {formatDate(d.updated_at)}
                    </td>
                    <td>
                      <Link
                        href={`/documents/${d.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        열기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
