"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** 새 문서 생성 후 에디터로 이동. */
export async function createDocument(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("documents")
    .insert({ owner_id: user.id, title: "Untitled" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("문서 생성에 실패했습니다.");
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    target_type: "document",
    target_id: data.id,
    action: "create",
  });

  redirect(`/documents/${data.id}`);
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
  if (!user) return { ok: false, error: "인증이 필요합니다." };

  const { error } = await supabase
    .from("documents")
    .update({ title: title.trim() || "Untitled", content })
    .eq("id", id);

  if (error) return { ok: false, error: "저장에 실패했습니다." };

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
  if (error) return { ok: false, error: "삭제에 실패했습니다." };
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
  if (error) return { ok: false, error: "변경에 실패했습니다." };
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
  if (!user) return { ok: false, error: "인증이 필요합니다." };

  const id = recipientId.trim();
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) {
    return { ok: false, error: "올바른 공유 ID(UUID) 형식이 아닙니다." };
  }
  if (id === user.id) {
    return { ok: false, error: "자기 자신에게는 공유할 수 없습니다." };
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
        "권한 부여에 실패했습니다. 공유 ID가 존재하는 사용자인지 확인하세요.",
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
  if (error) return { ok: false, error: "회수에 실패했습니다." };
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
