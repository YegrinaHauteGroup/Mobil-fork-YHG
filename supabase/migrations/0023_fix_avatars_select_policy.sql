-- ============================================================================
-- 아바타 업로드가 동작하지 않던 원인 — avatars 버킷에 SELECT 정책이 누락됨.
-- ----------------------------------------------------------------------------
-- 0020 에서 avatars 버킷에 insert/update/delete 정책만 만들고 select 정책을
-- 빠뜨렸다(형제 버킷인 files/media 는 둘 다 select 정책이 있음). supabase-js 의
-- upload({ upsert: true }) 는 대상 경로의 기존 객체를 확인/치환하는 과정에서
-- storage.objects 에 대한 SELECT 권한이 필요하고, 그 정책이 없어 업로드가
-- RLS 에 막혀 실패했다("사진이 추가가 안 됨" 증상의 근본 원인).
--
-- avatars 는 공개(public) 버킷이라 이미지 자체는 공개 URL 로 서빙되므로, 여기
-- SELECT 정책은 스토리지 API 내부 동작(upsert 존재 확인 등)을 위해 공개 읽기로
-- 둔다(민감 원본은 여전히 비공개 files 버킷을 사용).
-- ============================================================================

create policy storage_avatars_select on storage.objects for select
using (bucket_id = 'avatars');
