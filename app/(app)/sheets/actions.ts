"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { extractTagsFromText } from "@/lib/tags";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** 탭 시스템용: 리다이렉트 없이 새 시트를 만들고 id/title 만 반환. */
export async function createSheetTab(): Promise<{ id: string; title: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");

  const { data, error } = await supabase
    .from("sheets")
    .insert({ owner_id: user.id, title: "Untitled sheet" })
    .select("id, title")
    .single();

  if (error || !data) throw new Error("Failed to create sheet.");
  return { id: data.id, title: data.title };
}

/** 탭 시스템용: 시트 데이터 + 편집 가능 여부를 한 번에 조회. */
export async function getSheetForTab(id: string) {
  const { userId, profile } = await requireUser();
  const supabase = await createClient();

  const { data: sheet } = await supabase
    .from("sheets")
    .select("id, owner_id, title, data, is_public, updated_at")
    .eq("id", id)
    .single();

  if (!sheet) return null;

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

  return {
    id: sheet.id,
    title: sheet.title,
    data: sheet.data,
    isPublic: sheet.is_public,
    canEdit,
    isOwner: sheet.owner_id === userId,
    myShareId: userId,
  };
}

export async function saveSheet(
  id: string,
  title: string,
  data: Json
): Promise<ActionResult> {
  const supabase = await createClient();
  const finalTitle = title.trim() || "Untitled sheet";
  const { error } = await supabase
    .from("sheets")
    .update({ title: finalTitle, data })
    .eq("id", id);
  if (error) return { ok: false, error: "Save failed." };

  after(async () => {
    const tags = extractTagsFromText(finalTitle);
    await supabase.rpc("sync_object_tags", { p_kind: "sheet", p_id: id, p_tag_names: tags }).then(
      () => {},
      () => {}
    );
  });

  revalidatePath(`/sheets/${id}`);
  return { ok: true };
}

export async function deleteSheet(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("sheets").delete().eq("id", id);
  if (error) return { ok: false, error: "Delete failed." };
  after(async () => {
    await supabase.rpc("cleanup_object_links", { p_kind: "sheet", p_id: id }).then(
      () => {},
      () => {}
    );
    await supabase.rpc("cleanup_object_tags", { p_kind: "sheet", p_id: id }).then(
      () => {},
      () => {}
    );
  });
  revalidatePath("/sheets");
  return { ok: true };
}

export async function setSheetPublic(
  id: string,
  isPublic: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sheets")
    .update({ is_public: isPublic })
    .eq("id", id);
  if (error) return { ok: false, error: "Update failed." };
  revalidatePath(`/sheets/${id}`);
  return { ok: true };
}

export async function shareSheet(
  sheetId: string,
  recipientId: string,
  permission: "view" | "edit"
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Authentication required." };
  const id = recipientId.trim();
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) return { ok: false, error: "Not a valid Share ID (UUID)." };
  if (id === user.id) return { ok: false, error: "You can't share with yourself." };

  const { error } = await supabase.from("sheet_permissions").upsert(
    { sheet_id: sheetId, user_id: id, permission, granted_by: user.id },
    { onConflict: "sheet_id,user_id" }
  );
  if (error)
    return {
      ok: false,
      error: "Failed to grant access. Check that the Share ID belongs to an existing user.",
    };
  revalidatePath(`/sheets/${sheetId}`);
  return { ok: true };
}

export async function revokeSheetShare(permissionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sheet_permissions")
    .delete()
    .eq("id", permissionId);
  if (error) return { ok: false, error: "Failed to revoke." };
  return { ok: true };
}

export async function listSheetShares(sheetId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sheet_permissions")
    .select("id, user_id, permission, granted_at")
    .eq("sheet_id", sheetId)
    .order("granted_at", { ascending: true });
  return data ?? [];
}
