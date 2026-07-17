import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { createCodeFile } from "./actions";
import { CodeList } from "./code-list";

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

        <CodeList files={list} userId={userId} />
      </div>
    </>
  );
}
