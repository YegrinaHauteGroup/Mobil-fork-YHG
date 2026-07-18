import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isNextControlFlowError } from "@/lib/next-control-flow";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * 현재 인증된 사용자와 프로필을 반환한다. 미인증 시 로그인으로 리다이렉트.
 * 프로필은 auth.users 트리거(0003)로 항상 존재하지만, 복제 지연 등에 대비해
 * 이메일 폴백을 둔다.
 */
export async function requireUser(): Promise<{
  userId: string;
  email: string;
  profile: Profile;
}> {
  let supabase;
  let user;
  try {
    supabase = await createClient();
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    // Supabase 설정/연결 오류로 보호된 페이지 전체가 500 이 되는 대신
    // 로그인 화면으로 안전하게 보낸다.
    console.error("[requireUser] Supabase 세션 확인 실패:", error);
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    email: user.email ?? "",
    profile:
      profile ??
      ({
        id: user.id,
        email: user.email ?? "",
        display_name: null,
        role: "user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Profile),
  };
}
