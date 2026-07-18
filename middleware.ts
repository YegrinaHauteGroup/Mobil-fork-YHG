import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { buildSecurityHeaders } from "@/lib/security-headers";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  for (const [key, value] of buildSecurityHeaders(request.nextUrl.pathname)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * 다음을 제외한 모든 요청 경로에 적용:
     * - _next/static, _next/image (정적 자산)
     * - favicon 및 이미지 확장자
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
