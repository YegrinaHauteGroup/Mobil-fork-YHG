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
  const passwordConfirm = String(formData.get("password_confirm") || "");
  const displayName = String(formData.get("display_name") || "").trim();

  if (!email || !password) {
    return { error: "Enter email and password." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== passwordConfirm) {
    return { error: "Passwords do not match." };
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
      return { error: "This email is already registered." };
    }
    return { error: "Sign-up failed. Please try again shortly." };
  }

  // 세션이 즉시 발급되면(이메일 확인 비활성) 바로 대시보드로.
  if (data.session) {
    redirect("/dashboard");
  }

  // 이메일 확인이 필요한 경우.
  return { ok: true, needsConfirmation: true };
}
