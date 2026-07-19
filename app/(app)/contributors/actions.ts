"use server";

import { createClient } from "@/lib/supabase/server";

export type ContributorRow = {
  user_id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  first_contributed_at: string;
};

/** 소유자가 아니면서 저장(수정)한 이력이 있는 사용자 목록. */
export async function listContributors(
  kind: "document" | "code" | "sheet" | "mindmap",
  id: string
): Promise<ContributorRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_content_contributors", {
    p_kind: kind,
    p_id: id,
  });
  if (error) return [];
  return data ?? [];
}
