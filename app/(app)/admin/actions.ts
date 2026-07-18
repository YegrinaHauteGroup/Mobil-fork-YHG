"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function generateAdminCode(
  expiresAt: string | null
): Promise<{ code: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_admin_code", {
    p_expires_at: expiresAt,
  });

  if (error || !data) {
    return { error: "Failed to issue code. Check admin privileges." };
  }
  return { code: data as string };
}

export type OrphanedMediaRow = { name: string; bytes: number; created_at: string };

/** 어떤 문서에도 참조되지 않는 media 버킷 오브젝트를 찾는다(관리자 전용). */
export async function listOrphanedMedia(): Promise<
  { rows: OrphanedMediaRow[] } | { error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_orphaned_media");
  if (error) return { error: "Failed to scan media. Check admin privileges." };
  return { rows: data ?? [] };
}

/** 스캔된 고아 오브젝트를 Storage API 로 삭제한다(직접 SQL DELETE 는 보호 트리거로 차단됨). */
export async function deleteOrphanedMedia(
  names: string[]
): Promise<{ removed: number } | { error: string }> {
  if (names.length === 0) return { removed: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("media").remove(names);
  if (error) return { error: "Failed to delete media objects." };
  revalidatePath("/admin");
  return { removed: data?.length ?? 0 };
}
