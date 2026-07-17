"use server";

import { createClient } from "@/lib/supabase/server";

export async function generateAdminCode(
  expiresAt: string | null
): Promise<{ code: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_admin_code", {
    p_expires_at: expiresAt,
  });

  if (error || !data) {
    return { error: "코드 발급에 실패했습니다. 관리자 권한을 확인하세요." };
  }
  return { code: data as string };
}
