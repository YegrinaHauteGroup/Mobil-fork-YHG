import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { createDocumentTab, importDocument } from "./actions";
import { DocumentsList } from "./documents-list";
import { NewItemButton } from "../workspace/new-item-button";
import { ImportItemButton } from "../workspace/import-item-button";

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
        <span className="topbar-title">Documents</span>
        <span className="crumb">WORKSPACE / DOCUMENTS</span>
      </div>
      <div className="content">
        <div className="page-head">
          <div>
            <h1 className="page-h">Documents</h1>
            <p className="page-sub">
              Your own and shared documents. Content is stored as structured JSON.
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <ImportItemButton
              kind="document"
              label="Import file"
              accept=".txt,.docx,.hwp,.hwpx"
              importAction={importDocument}
            />
            <NewItemButton kind="document" label="New document" create={createDocumentTab} />
          </div>
        </div>

        <DocumentsList docs={docs ?? []} userId={userId} />
      </div>
    </>
  );
}
