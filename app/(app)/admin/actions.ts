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
    return { error: "Failed to issue code. Check admin privileges." };
  }
  return { code: data as string };
}
