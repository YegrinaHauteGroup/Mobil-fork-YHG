"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignupState =
  | { error: string }
  | { ok: true; needsConfirmation: boolean }
  | null;

export async function signup(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("display_name") || "").trim();

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력하세요." };
  }
  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || null },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { error: "이미 가입된 이메일입니다." };
    }
    return { error: "가입에 실패했습니다. 잠시 후 다시 시도하세요." };
  }

  // 세션이 즉시 발급되면(이메일 확인 비활성) 바로 대시보드로.
  if (data.session) {
    redirect("/dashboard");
  }

  // 이메일 확인이 필요한 경우.
  return { ok: true, needsConfirmation: true };
}
