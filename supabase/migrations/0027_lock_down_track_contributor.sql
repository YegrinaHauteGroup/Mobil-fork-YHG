-- ============================================================================
-- track_contributor() 는 트리거로만 호출되어야 한다(직접 RPC 호출 불필요).
-- 트리거 실행 자체는 EXECUTE 권한과 무관하게 항상 동작하므로, 모든 롤에서
-- EXECUTE 를 회수해도 기여자 기록 기능에는 영향이 없다 — advisor 경고
-- (anon/authenticated 가 /rest/v1/rpc/track_contributor 를 직접 호출 가능) 대응.
-- ============================================================================

revoke all on function public.track_contributor() from public, anon, authenticated;
