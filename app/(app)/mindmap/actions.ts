"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { Json } from "@/lib/database.types";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** 탭 시스템용: 리다이렉트 없이 새 마인드맵을 만들고 id/title 만 반환. */
export async function createMindMapTab(): Promise<{ id: string; title: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");

  const { data, error } = await supabase
    .from("mind_maps")
    .insert({ owner_id: user.id, title: "Untitled map" })
    .select("id, title")
    .single();

  if (error || !data) throw new Error("Failed to create map.");
  return { id: data.id, title: data.title };
}

/** 탭 시스템용: 마인드맵 데이터 + 편집 가능 여부 + 참조 아이템 목록을 조회. */
export async function getMindMapForTab(id: string) {
  const { userId, profile } = await requireUser();
  const supabase = await createClient();

  const { data: map } = await supabase
    .from("mind_maps")
    .select("id, owner_id, title, data, is_public, updated_at")
    .eq("id", id)
    .single();

  if (!map) return null;

  let canEdit = map.owner_id === userId || profile.role === "admin";
  if (!canEdit) {
    const { data: perm } = await supabase
      .from("mind_map_permissions")
      .select("permission")
      .eq("mind_map_id", id)
      .eq("user_id", userId)
      .maybeSingle();
    canEdit = perm?.permission === "edit";
  }

  const items = await listWorkspaceItems();

  return {
    id: map.id,
    title: map.title,
    data: map.data,
    isPublic: map.is_public,
    canEdit,
    isOwner: map.owner_id === userId,
    myShareId: userId,
    items,
  };
}

export async function saveMindMap(
  id: string,
  title: string,
  data: Json
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("mind_maps")
    .update({ title: title.trim() || "Untitled map", data })
    .eq("id", id);
  if (error) return { ok: false, error: "Save failed." };
  revalidatePath(`/mindmap/${id}`);
  return { ok: true };
}

export async function deleteMindMap(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("mind_maps").delete().eq("id", id);
  if (error) return { ok: false, error: "Delete failed." };
  revalidatePath("/mindmap");
  return { ok: true };
}

export async function setMindMapPublic(
  id: string,
  isPublic: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("mind_maps")
    .update({ is_public: isPublic })
    .eq("id", id);
  if (error) return { ok: false, error: "Update failed." };
  revalidatePath(`/mindmap/${id}`);
  return { ok: true };
}

/** 참조 노드 선택용: 접근 가능한 파일·코드·문서 목록. */
export type WorkspaceItem = {
  id: string;
  label: string;
  kind: "file" | "code" | "document";
};

export async function listWorkspaceItems(): Promise<WorkspaceItem[]> {
  const supabase = await createClient();
  const [files, code, docs] = await Promise.all([
    supabase.from("files").select("id, file_name").order("created_at", { ascending: false }).limit(200),
    supabase.from("code_files").select("id, name").order("updated_at", { ascending: false }).limit(200),
    supabase.from("documents").select("id, title").order("updated_at", { ascending: false }).limit(200),
  ]);
  const out: WorkspaceItem[] = [];
  for (const f of files.data ?? []) out.push({ id: f.id, label: f.file_name, kind: "file" });
  for (const c of code.data ?? []) out.push({ id: c.id, label: c.name, kind: "code" });
  for (const d of docs.data ?? []) out.push({ id: d.id, label: d.title || "Untitled", kind: "document" });
  return out;
}

export async function shareMindMap(
  mapId: string,
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

  const { error } = await supabase.from("mind_map_permissions").upsert(
    { mind_map_id: mapId, user_id: id, permission, granted_by: user.id },
    { onConflict: "mind_map_id,user_id" }
  );
  if (error)
    return {
      ok: false,
      error: "Failed to grant access. Check that the Share ID belongs to an existing user.",
    };
  revalidatePath(`/mindmap/${mapId}`);
  return { ok: true };
}

export async function revokeMindMapShare(permissionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("mind_map_permissions")
    .delete()
    .eq("id", permissionId);
  if (error) return { ok: false, error: "Failed to revoke." };
  return { ok: true };
}

export async function listMindMapShares(mapId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mind_map_permissions")
    .select("id, user_id, permission, granted_at")
    .eq("mind_map_id", mapId)
    .order("granted_at", { ascending: true });
  return data ?? [];
}
