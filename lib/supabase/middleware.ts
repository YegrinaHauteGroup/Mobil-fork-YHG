import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

/**
 * 모든 요청에서 Supabase 세션을 갱신하고, 보호된 경로 접근을 통제한다.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const isPublicRoute =
    pathname === "/" || isAuthRoute || pathname.startsWith("/auth");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 환경 변수가 없으면 createServerClient 가 즉시 예외를 던져 미들웨어가 죽고
  // (모든 경로에 매칭되므로) 사이트 전체가 500 이 된다. 배포 환경 변수 설정
  // 누락은 흔한 실수이므로, 공개 경로는 그대로 통과시키고 보호된 경로만
  // 안전하게 로그인으로 보낸다.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[middleware] NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다."
    );
    if (!isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  let user;
  try {
    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch (error) {
    // Supabase 연결 실패(네트워크 오류, 잘못된 URL 등)로 미들웨어가 죽어
    // 사이트 전체가 500 이 되는 것을 방지한다.
    console.error("[middleware] Supabase 세션 확인 실패:", error);
    if (!isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // 미인증 사용자가 보호된 경로 접근 → 로그인으로
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 인증된 사용자가 로그인/가입 페이지 접근 → 대시보드로
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
