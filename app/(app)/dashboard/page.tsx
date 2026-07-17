import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { Copyable } from "@/components/copyable";

export default async function DashboardPage() {
  const { userId, profile } = await requireUser();
  const supabase = await createClient();

  const [filesRes, docsRes, codeRes, mapsRes, sharedDocsRes] = await Promise.all([
    supabase.from("files").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("code_files").select("id", { count: "exact", head: true }),
    supabase.from("mind_maps").select("id", { count: "exact", head: true }),
    supabase
      .from("documents")
      .select("id, title, updated_at, owner_id")
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const fileCount = filesRes.count ?? 0;
  const docCount = docsRes.count ?? 0;
  const codeCount = codeRes.count ?? 0;
  const mapCount = mapsRes.count ?? 0;
  const recentDocs = sharedDocsRes.data ?? [];

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Dashboard</span>
        <span className="crumb">HOME / OVERVIEW</span>
      </div>

      <div className="content">
        <div className="page-head">
          <div>
            <h1 className="page-h">
              Welcome, {profile.display_name || profile.email.split("@")[0]}
            </h1>
            <p className="page-sub">
              Overview of your storage and recent documents.
            </p>
          </div>
          <div className="row">
            <Link href="/files" className="btn">
              Upload file
            </Link>
            <Link href="/documents" className="btn btn-primary">
              New document
            </Link>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <div className="stat-val">{docCount}</div>
            <div className="stat-label label">DOCUMENTS</div>
          </div>
          <div className="stat">
            <div className="stat-val">{codeCount}</div>
            <div className="stat-label label">CODE FILES</div>
          </div>
          <div className="stat">
            <div className="stat-val">{fileCount}</div>
            <div className="stat-label label">FILES</div>
          </div>
          <div className="stat">
            <div className="stat-val">{mapCount}</div>
            <div className="stat-label label">MAPS</div>
          </div>
          <div className="stat">
            <div className="stat-val">{profile.role === "admin" ? "ADMIN" : "USER"}</div>
            <div className="stat-label label">ACCESS LEVEL</div>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <span className="label">My Share ID</span>
          </div>
          <div className="panel-body">
            <p className="page-sub" style={{ margin: "0 0 12px" }}>
              Others need this ID to share files or documents with you.
            </p>
            <Copyable value={userId} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="label">RECENT DOCUMENTS</span>
            <Link href="/documents" className="btn btn-ghost btn-sm">
              View all
            </Link>
          </div>
          {recentDocs.length === 0 ? (
            <div className="empty">
              No documents yet.{" "}
              <Link href="/documents">Create your first document.</Link>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th style={{ width: 180 }}>Updated</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {recentDocs.map((d) => (
                  <tr key={d.id}>
                    <td>{d.title || "Untitled"}</td>
                    <td className="mono muted">
                      {new Date(d.updated_at).toLocaleString("en-US")}
                    </td>
                    <td>
                      <Link
                        href={`/documents/${d.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        Open
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
