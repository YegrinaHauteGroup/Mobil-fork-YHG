import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createCodeFile } from "./actions";

export const dynamic = "force-dynamic";

export default async function CodePage() {
  const { userId } = await requireUser();
  const supabase = await createClient();

  const { data: files } = await supabase
    .from("code_files")
    .select("id, owner_id, name, language, is_public, updated_at")
    .order("updated_at", { ascending: false });

  const list = files ?? [];

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">코드</span>
        <span className="crumb">WORKSPACE / CODE</span>
      </div>
      <div className="content">
        <div className="page-head">
          <div>
            <h1 className="page-h">코드</h1>
            <p className="page-sub">
              웹에서 코드를 작성·편집합니다. 구문 강조와 자동/수동 저장을
              지원합니다.
            </p>
          </div>
          <form action={createCodeFile}>
            <button type="submit" className="btn btn-primary">
              새 코드 파일
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="label">CODE FILES ({list.length})</span>
          </div>
          {list.length === 0 ? (
            <div className="empty">
              코드 파일이 없습니다. “새 코드 파일”로 시작하세요.
            </div>
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
                {list.map((c) => (
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
                      <Link
                        href={`/code/${c.id}`}
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
