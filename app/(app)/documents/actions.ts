"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { Json } from "@/lib/database.types";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** 탭 시스템용: 리다이렉트 없이 새 문서를 만들고 id/title 만 반환. */
export async function createDocumentTab(): Promise<{ id: string; title: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");

  const { data, error } = await supabase
    .from("documents")
    .insert({ owner_id: user.id, title: "Untitled" })
    .select("id, title")
    .single();

  if (error || !data) throw new Error("Failed to create document.");

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    target_type: "document",
    target_id: data.id,
    action: "create",
  });

  return { id: data.id, title: data.title };
}

/** 탭 시스템용: 문서 데이터 + 편집 가능 여부를 한 번에 조회. */
export async function getDocumentForTab(id: string) {
  const { userId, profile } = await requireUser();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("id, owner_id, title, content, is_public, updated_at")
    .eq("id", id)
    .single();

  if (!doc) return null;

  let canEdit = doc.owner_id === userId || profile.role === "admin";
  if (!canEdit) {
    const { data: perm } = await supabase
      .from("document_permissions")
      .select("permission")
      .eq("document_id", id)
      .eq("user_id", userId)
      .maybeSingle();
    canEdit = perm?.permission === "edit";
  }

  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    isPublic: doc.is_public,
    canEdit,
    isOwner: doc.owner_id === userId,
    myShareId: userId,
  };
}

/** 제목/콘텐츠 저장. content 는 Tiptap JSON. */
export async function saveDocument(
  id: string,
  title: string,
  content: Json
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Authentication required." };

  const { error } = await supabase
    .from("documents")
    .update({ title: title.trim() || "Untitled", content })
    .eq("id", id);

  if (error) return { ok: false, error: "Save failed." };

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    target_type: "document",
    target_id: id,
    action: "update",
  });

  revalidatePath(`/documents/${id}`);
  return { ok: true };
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { ok: false, error: "Delete failed." };
  revalidatePath("/documents");
  return { ok: true };
}

/** 공개 여부 토글. */
export async function setDocumentPublic(
  id: string,
  isPublic: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({ is_public: isPublic })
    .eq("id", id);
  if (error) return { ok: false, error: "Update failed." };
  revalidatePath(`/documents/${id}`);
  return { ok: true };
}

export async function shareDocument(
  documentId: string,
  recipientId: string,
  permission: "view" | "edit"
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Authentication required." };

  const id = recipientId.trim();
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) {
    return { ok: false, error: "Not a valid Share ID (UUID)." };
  }
  if (id === user.id) {
    return { ok: false, error: "You can't share with yourself." };
  }

  const { error } = await supabase.from("document_permissions").upsert(
    {
      document_id: documentId,
      user_id: id,
      permission,
      granted_by: user.id,
    },
    { onConflict: "document_id,user_id" }
  );

  if (error) {
    return {
      ok: false,
      error:
        "Failed to grant access. Check that the Share ID belongs to an existing user.",
    };
  }

  revalidatePath(`/documents/${documentId}`);
  return { ok: true };
}

export async function revokeDocumentShare(
  permissionId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_permissions")
    .delete()
    .eq("id", permissionId);
  if (error) return { ok: false, error: "Failed to revoke." };
  return { ok: true };
}

export async function listDocumentShares(documentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_permissions")
    .select("id, user_id, permission, granted_at")
    .eq("document_id", documentId)
    .order("granted_at", { ascending: true });
  return data ?? [];
}
