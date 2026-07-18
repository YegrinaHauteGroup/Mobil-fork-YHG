import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { createMindMapTab } from "./actions";
import { MindMapList } from "./mindmap-list";
import { NewItemButton } from "../workspace/new-item-button";

export const dynamic = "force-dynamic";

export default async function MindMapPage() {
  const { userId } = await requireUser();
  const supabase = await createClient();

  const { data: maps } = await supabase
    .from("mind_maps")
    .select("id, owner_id, title, is_public, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Mindmap</span>
        <span className="crumb">WORKSPACE / MINDMAP</span>
      </div>
      <div className="content">
        <div className="page-head">
          <div>
            <h1 className="page-h">Mindmap</h1>
            <p className="page-sub">
              Arrange files, code and documents as nodes and connect them with
              parent-child links on a free-form canvas.
            </p>
          </div>
          <NewItemButton kind="mindmap" label="New map" create={createMindMapTab} />
        </div>

        <MindMapList maps={maps ?? []} userId={userId} />
      </div>
    </>
  );
}
