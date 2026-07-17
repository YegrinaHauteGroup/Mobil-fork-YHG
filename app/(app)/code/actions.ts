"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { detectLanguage, isLangKey } from "@/lib/languages";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** 새 코드 파일 생성 후 에디터로 이동. */
export async function createCodeFile(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("code_files")
    .insert({ owner_id: user.id, name: "untitled.txt", language: "plaintext" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Failed to create code file.");
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    target_type: "code",
    target_id: data.id,
    action: "create",
  });

  redirect(`/code/${data.id}`);
}

/** 이름/언어/콘텐츠 저장. */
export async function saveCodeFile(
  id: string,
  name: string,
  language: string,
  content: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Authentication required." };

  const lang = isLangKey(language) ? language : "plaintext";

  const { error } = await supabase
    .from("code_files")
    .update({ name: name.trim() || "untitled.txt", language: lang, content })
    .eq("id", id);

  if (error) return { ok: false, error: "Save failed." };

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    target_type: "code",
    target_id: id,
    action: "update",
  });

  revalidatePath(`/code/${id}`);
  return { ok: true };
}

export async function deleteCodeFile(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("code_files").delete().eq("id", id);
  if (error) return { ok: false, error: "Delete failed." };
  revalidatePath("/code");
  return { ok: true };
}

export async function setCodeFilePublic(
  id: string,
  isPublic: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("code_files")
    .update({ is_public: isPublic })
    .eq("id", id);
  if (error) return { ok: false, error: "Update failed." };
  revalidatePath(`/code/${id}`);
  return { ok: true };
}

/** 파일명 확장자로 언어 자동 추정 (편의 기능). */
export async function suggestLanguage(name: string): Promise<string> {
  return detectLanguage(name);
}

export async function shareCodeFile(
  codeFileId: string,
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

  const { error } = await supabase.from("code_file_permissions").upsert(
    {
      code_file_id: codeFileId,
      user_id: id,
      permission,
      granted_by: user.id,
    },
    { onConflict: "code_file_id,user_id" }
  );

  if (error) {
    return {
      ok: false,
      error:
        "Failed to grant access. Check that the Share ID belongs to an existing user.",
    };
  }

  revalidatePath(`/code/${codeFileId}`);
  return { ok: true };
}

export async function revokeCodeFileShare(
  permissionId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("code_file_permissions")
    .delete()
    .eq("id", permissionId);
  if (error) return { ok: false, error: "Failed to revoke." };
  return { ok: true };
}

export async function listCodeFileShares(codeFileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("code_file_permissions")
    .select("id, user_id, permission, granted_at")
    .eq("code_file_id", codeFileId)
    .order("granted_at", { ascending: true });
  return data ?? [];
}
