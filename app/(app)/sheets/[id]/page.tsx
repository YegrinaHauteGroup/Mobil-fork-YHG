import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { SpreadsheetLoader } from "./spreadsheet-loader";

export const dynamic = "force-dynamic";

export default async function SheetEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, profile } = await requireUser();
  const supabase = await createClient();

  const { data: sheet } = await supabase
    .from("sheets")
    .select("id, owner_id, title, data, is_public, updated_at")
    .eq("id", id)
    .single();

  if (!sheet) notFound();

  let canEdit = sheet.owner_id === userId || profile.role === "admin";
  if (!canEdit) {
    const { data: perm } = await supabase
      .from("sheet_permissions")
      .select("permission")
      .eq("sheet_id", id)
      .eq("user_id", userId)
      .maybeSingle();
    canEdit = perm?.permission === "edit";
  }

  return (
    <>
      <div className="topbar">
        <div className="row" style={{ gap: 12 }}>
          <Link href="/sheets" className="btn btn-ghost btn-sm">
            ← Sheets
          </Link>
          <span className="crumb">WORKSPACE / SHEETS / {sheet.id.slice(0, 8)}</span>
        </div>
        <span className="crumb">{canEdit ? "READ · WRITE" : "READ ONLY"}</span>
      </div>
      <SpreadsheetLoader
        sheetId={sheet.id}
        initialTitle={sheet.title}
        initialData={sheet.data}
        canEdit={canEdit}
        isOwner={sheet.owner_id === userId}
        isPublic={sheet.is_public}
        myShareId={userId}
      />
    </>
  );
}
