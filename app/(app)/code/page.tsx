import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { createCodeFileTab } from "./actions";
import { CodeList } from "./code-list";
import { NewItemButton } from "../workspace/new-item-button";

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
        <span className="topbar-title">Code</span>
        <span className="crumb">WORKSPACE / CODE</span>
      </div>
      <div className="content">
        <div className="page-head">
          <div>
            <h1 className="page-h">Code</h1>
            <p className="page-sub">
              Write and edit code in the browser — syntax highlighting, auto and manual save.
            </p>
          </div>
          <NewItemButton kind="code" label="New code file" create={createCodeFileTab} />
        </div>

        <CodeList files={list} userId={userId} />
      </div>
    </>
  );
}
