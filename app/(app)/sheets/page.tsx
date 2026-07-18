import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { createSheetTab } from "./actions";
import { SheetList } from "./sheet-list";
import { NewItemButton } from "../workspace/new-item-button";

export const dynamic = "force-dynamic";

export default async function SheetsPage() {
  const { userId } = await requireUser();
  const supabase = await createClient();

  const { data: sheets } = await supabase
    .from("sheets")
    .select("id, owner_id, title, is_public, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Sheets</span>
        <span className="crumb">WORKSPACE / SHEETS</span>
      </div>
      <div className="content">
        <div className="page-head">
          <div>
            <h1 className="page-h">Sheets</h1>
            <p className="page-sub">
              Spreadsheets with formulas, cell formatting and multiple tabs —
              in the browser.
            </p>
          </div>
          <NewItemButton kind="sheet" label="New sheet" create={createSheetTab} />
        </div>

        <SheetList sheets={sheets ?? []} userId={userId} />
      </div>
    </>
  );
}
