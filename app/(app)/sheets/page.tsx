import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { createSheetTab, importSheet } from "./actions";
import { SheetList } from "./sheet-list";
import { NewItemButton } from "../workspace/new-item-button";
import { ImportItemButton } from "../workspace/import-item-button";

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
        <span className="topbar-title">Table</span>
        <span className="crumb">WORKSPACE / TABLE</span>
      </div>
      <div className="content">
        <div className="page-head">
          <div>
            <h1 className="page-h">Table</h1>
            <p className="page-sub">
              Spreadsheets with formulas, cell formatting and multiple tabs —
              in the browser.
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <ImportItemButton
              kind="sheet"
              label="Import file"
              accept=".csv,.xlsx,.xls"
              importAction={importSheet}
            />
            <NewItemButton kind="sheet" label="New sheet" create={createSheetTab} />
          </div>
        </div>

        <SheetList sheets={sheets ?? []} userId={userId} />
      </div>
    </>
  );
}
