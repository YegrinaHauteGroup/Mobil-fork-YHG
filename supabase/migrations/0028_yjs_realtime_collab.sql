-- ============================================================================
-- 실시간 동시편집(1단계: 문서·코드) — Yjs CRDT 상태 스냅샷 컬럼
-- ----------------------------------------------------------------------------
-- 전송 계층은 별도 서버(y-websocket 등) 없이 Supabase Realtime Broadcast 를
-- 그대로 쓴다(클라이언트끼리 바이너리 업데이트를 base64 로 주고받음).
-- Broadcast 는 과거 이력을 보관하지 않으므로, 새로 접속하는 클라이언트가
-- 그 시점까지의 상태를 복원할 수 있도록 마지막 Yjs 상태 스냅샷을 저장해둔다
-- (Y.encodeStateAsUpdate 결과를 base64 텍스트로). 기존 content/content 컬럼은
-- 계속 진실의 원천으로 유지한다(내보내기·미리보기 등 다른 기능이 참조).
-- ============================================================================

alter table public.documents add column yjs_state text;
alter table public.code_files add column yjs_state text;
