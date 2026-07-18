-- ============================================================================
-- SECURITY DEFINER 함수 실행 권한 하드닝
-- ----------------------------------------------------------------------------
-- 근본 원인: Supabase 는 ALTER DEFAULT PRIVILEGES 로 신규 함수의 EXECUTE 를
-- anon / authenticated 롤에 자동 부여한다. 0001 의 `revoke all ... from public`
-- 은 PUBLIC 만 회수하므로 명시적 anon 권한이 남아, 미인증(anon) 사용자가
-- 관리자 코드 함수를 REST rpc 로 호출할 수 있는 상태였다(get_advisors 경고).
--
-- 영구 시정(D5): 각 함수의 의도된 호출자만 남기고 나머지 롤의 EXECUTE 를 회수.
--   - handle_new_user : 트리거 전용 → 전 롤 회수 (트리거는 EXECUTE 와 무관하게 발화)
--   - redeem/generate : authenticated 만 (관리자 코드 소각/발급의 인증 강제)
--   - is_admin        : RLS 정책이 호출하므로 anon/authenticated 유지(의도된 설계)
-- ============================================================================

-- 트리거 전용 함수는 API 표면에서 완전히 제거한다.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- 관리자 코드 함수는 인증된 사용자만 호출 가능하게 한다.
revoke all on function public.redeem_admin_code(text) from public, anon;
revoke all on function public.generate_admin_code(timestamptz) from public, anon;
grant execute on function public.redeem_admin_code(text) to authenticated;
grant execute on function public.generate_admin_code(timestamptz) to authenticated;

-- is_admin() 은 RLS 정책 평가에 필요하므로 anon/authenticated 실행 권한을 유지한다.
-- (SECURITY DEFINER 로 profiles 를 RLS 우회 조회하여 정책 재귀를 방지하는 의도된 설계)
