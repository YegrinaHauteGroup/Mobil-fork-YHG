import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { Copyable } from "@/components/copyable";

export default async function DashboardPage() {
  const { userId, profile } = await requireUser();
  const supabase = await createClient();

  const [filesRes, docsRes, sharedDocsRes] = await Promise.all([
    supabase.from("files").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase
      .from("documents")
      .select("id, title, updated_at, owner_id")
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const fileCount = filesRes.count ?? 0;
  const docCount = docsRes.count ?? 0;
  const recentDocs = sharedDocsRes.data ?? [];

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">대시보드</span>
        <span className="crumb">HOME / OVERVIEW</span>
      </div>

      <div className="content">
        <div className="page-head">
          <div>
            <h1 className="page-h">
              안녕하세요, {profile.display_name || profile.email.split("@")[0]}
            </h1>
            <p className="page-sub">
              저장소 현황과 최근 문서를 확인하세요.
            </p>
          </div>
          <div className="row">
            <Link href="/files" className="btn">
              파일 업로드
            </Link>
            <Link href="/documents" className="btn btn-primary">
              새 문서
            </Link>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <div className="stat-val">{docCount}</div>
            <div className="stat-label label">DOCUMENTS</div>
          </div>
          <div className="stat">
            <div className="stat-val">{fileCount}</div>
            <div className="stat-label label">FILES</div>
          </div>
          <div className="stat">
            <div className="stat-val">{profile.role === "admin" ? "ADMIN" : "USER"}</div>
            <div className="stat-label label">ACCESS LEVEL</div>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <span className="label">내 공유 ID</span>
          </div>
          <div className="panel-body">
            <p className="page-sub" style={{ margin: "0 0 12px" }}>
              다른 사용자가 나에게 파일·문서를 공유하려면 이 ID가 필요합니다.
            </p>
            <Copyable value={userId} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="label">RECENT DOCUMENTS</span>
            <Link href="/documents" className="btn btn-ghost btn-sm">
              전체 보기
            </Link>
          </div>
          {recentDocs.length === 0 ? (
            <div className="empty">
              아직 문서가 없습니다.{" "}
              <Link href="/documents">첫 문서를 만들어보세요.</Link>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>제목</th>
                  <th style={{ width: 180 }}>수정일</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {recentDocs.map((d) => (
                  <tr key={d.id}>
                    <td>{d.title || "Untitled"}</td>
                    <td className="mono muted">
                      {new Date(d.updated_at).toLocaleString("ko-KR")}
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

export const dynamic = "force-dynamic";
