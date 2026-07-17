"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RedeemState = { error: string } | { ok: true } | null;

export async function redeemCode(
  _prev: RedeemState,
  formData: FormData
): Promise<RedeemState> {
  const code = String(formData.get("code") || "").trim();
  if (!code) return { error: "코드를 입력하세요." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_admin_code", { p_code: code });

  if (error) {
    // redeem_admin_code 는 무효/사용됨 코드에 대해 예외를 던진다.
    return { error: "유효하지 않거나 이미 사용된 코드입니다." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
