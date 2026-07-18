"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createSheet(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("sheets")
    .insert({ owner_id: user.id, title: "Untitled sheet" })
    .select("id")
    .single();

  if (error || !data) throw new Error("Failed to create sheet.");
  redirect(`/sheets/${data.id}`);
}

export async function saveSheet(
  id: string,
  title: string,
  data: Json
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sheets")
    .update({ title: title.trim() || "Untitled sheet", data })
    .eq("id", id);
  if (error) return { ok: false, error: "Save failed." };
  revalidatePath(`/sheets/${id}`);
  return { ok: true };
}

export async function deleteSheet(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("sheets").delete().eq("id", id);
  if (error) return { ok: false, error: "Delete failed." };
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
