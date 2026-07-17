import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { createDocument } from "./actions";
import { DocumentsList } from "./documents-list";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const { userId } = await requireUser();
  const supabase = await createClient();

  const { data: docs } = await supabase
    .from("documents")
    .select("id, owner_id, title, is_public, updated_at")
    .order("updated_at", { ascending: false });

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

        <DocumentsList docs={docs ?? []} userId={userId} />
      </div>
    </>
  );
}
