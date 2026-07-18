import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isNextControlFlowError } from "@/lib/next-control-flow";

export default async function RootPage() {
  let user: User | null = null;
  try {
    const supabase = await createClient();
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    // Supabase 설정/연결 오류로 인해 루트 진입 자체가 500 이 되는 것을 방지한다.
    console.error("[RootPage] Supabase 세션 확인 실패:", error);
  }

  redirect(user ? "/dashboard" : "/login");
}
