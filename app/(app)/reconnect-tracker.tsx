"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LAST_SEEN_COOKIE } from "./reconnect-shared";

/**
 * 실제 화면이 정상적으로 뜬(=이 컴포넌트가 마운트/네비게이션된) 시각을
 * 쿠키에 남긴다. loading.tsx 는 다음 로딩 순간에 이 시각을 보고 "최근에도
 * 계속 쓰고 있었는지"를 판단해, 평범한 탭 이동에서는 Reconnecting… 을
 * 다시 보여주지 않는다 — 오래 자리를 비웠을 때만 보여주기 위함.
 */
export function ReconnectTracker() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      document.cookie = `${LAST_SEEN_COOKIE}=${Date.now()};path=/;max-age=31536000;samesite=lax`;
    } catch {
      // 쿠키를 못 쓰는 환경(프라이빗 모드 등)이면 그냥 매번 Reconnecting 을
      // 보여주는 쪽으로 안전하게 fallback 된다 — 별도 처리 불필요.
    }
  }, [pathname]);

  return null;
}
