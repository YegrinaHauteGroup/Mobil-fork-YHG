"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "files";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** 서명된 다운로드 URL 발급 (유효시간 60초). */
export async function getSignedUrl(
  fileId: string
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();

  const { data: file, error } = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", fileId)
    .single();

  if (error || !file) return { error: "파일을 찾을 수 없습니다." };

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(file.storage_path, 60, { download: true });

  if (signErr || !signed) return { error: "다운로드 링크 생성에 실패했습니다." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      target_type: "file",
      target_id: fileId,
      action: "download",
    });
  }

  return { url: signed.signedUrl };
}

/** 스토리지 객체와 메타데이터 행을 함께 삭제. */
export async function deleteFile(fileId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: file, error } = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", fileId)
    .single();

  if (error || !file) return { ok: false, error: "파일을 찾을 수 없습니다." };

  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .remove([file.storage_path]);

  if (storageErr) {
    return { ok: false, error: "스토리지 삭제에 실패했습니다." };
  }

  const { error: rowErr } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId);

  if (rowErr) return { ok: false, error: "메타데이터 삭제에 실패했습니다." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      target_type: "file",
      target_id: fileId,
      action: "delete",
    });
  }

  revalidatePath("/files");
  return { ok: true };
}

/** 공유 대상(user UUID)에게 view/edit 권한 부여. */
export async function shareFile(
  fileId: string,
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

  const { error } = await supabase.from("file_permissions").upsert(
    {
      file_id: fileId,
      user_id: id,
      permission,
      granted_by: user.id,
    },
    { onConflict: "file_id,user_id" }
  );

  if (error) {
    return {
      ok: false,
      error:
        "권한 부여에 실패했습니다. 공유 ID가 존재하는 사용자인지 확인하세요.",
    };
  }

  revalidatePath("/files");
  return { ok: true };
}

/** 공유 권한 회수. */
export async function revokeFileShare(
  permissionId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("file_permissions")
    .delete()
    .eq("id", permissionId);

  if (error) return { ok: false, error: "회수에 실패했습니다." };
  revalidatePath("/files");
  return { ok: true };
}

/** 특정 파일의 공유 권한 목록 조회. */
export async function listFileShares(fileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("file_permissions")
    .select("id, user_id, permission, granted_at")
    .eq("file_id", fileId)
    .order("granted_at", { ascending: true });
  return data ?? [];
}
