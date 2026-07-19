"use server";

import { createClient } from "@/lib/supabase/server";

export type StarKind = "document" | "code" | "sheet" | "file";

/** 현재 사용자가 별표한 항목의 id 목록(해당 kind 만). 계정별로 완전히
 * 분리되어 있다 — RLS 가 user_id = auth.uid() 로 강제한다. */
export async function listStarredIds(kind: StarKind): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("starred_items")
    .select("object_id")
    .eq("kind", kind);
  return (data ?? []).map((r) => r.object_id);
}

/** 별표 등록/해제. 클라이언트가 이미 다음 상태를 알고 있으므로(낙관적 업데이트)
 * 서버는 "먼저 조회해서 있으면 지우고 없으면 넣는" 식의 조회-후-처리를 할
 * 필요가 없다 — insert 는 unique 제약 충돌을 무시(on conflict do nothing)하고,
 * delete 는 조건에 맞는 행만 지우면 되므로 둘 다 원자적이고 경쟁 상태가 없다. */
export async function toggleStar(
  kind: StarKind,
  objectId: string,
  starred: boolean
): Promise<{ starred: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  if (starred) {
    const { error } = await supabase
      .from("starred_items")
      .upsert(
        { user_id: user.id, kind, object_id: objectId },
        { onConflict: "user_id,kind,object_id", ignoreDuplicates: true }
      );
    if (error) return { error: "Failed to star." };
    return { starred: true };
  }

  const { error } = await supabase
    .from("starred_items")
    .delete()
    .eq("user_id", user.id)
    .eq("kind", kind)
    .eq("object_id", objectId);
  if (error) return { error: "Failed to unstar." };
  return { starred: false };
}
