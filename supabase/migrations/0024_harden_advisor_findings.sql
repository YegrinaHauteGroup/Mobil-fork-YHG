-- ============================================================================
-- Supabase 보안 어드바이저 경고 대응
-- ----------------------------------------------------------------------------
-- (1) public_bucket_allows_listing (avatars)
--     0023 에서 upsert 업로드를 살리려고 avatars 버킷에 넓은 SELECT 정책을
--     달았는데, 그 결과 클라이언트가 버킷의 모든 파일(= 모든 사용자 아바타
--     경로 `{uid}/avatar.ext`)을 나열할 수 있게 되어 사용자 ID 가 노출된다.
--     아바타 이미지 자체는 공개 버킷의 공개 URL 로 서빙되므로(SELECT 정책과
--     무관) 넓은 SELECT 는 필요 없다. upsert 의 "기존 객체 존재 확인"에만
--     SELECT 가 필요하고 그건 자기 폴더만 보면 되므로, 소유자 폴더로 범위를
--     좁힌다.
--
-- (2) anon_security_definer_function_executable (is_admin)
--     is_admin() 은 0001 에서 기본 PUBLIC 실행 권한으로 만들어져 미인증(anon)
--     도 호출 가능했다. 앱은 모든 데이터 접근을 인증 뒤로 막으므로 anon 에는
--     불필요하다. public/anon 실행 권한을 회수하고 authenticated 에만 부여한다
--     (authenticated 는 유지하므로 RLS 정책 평가에 영향 없음).
-- ============================================================================

-- (1) avatars SELECT 정책을 소유자 폴더로 축소
drop policy if exists storage_avatars_select on storage.objects;
create policy storage_avatars_select on storage.objects for select
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- (2) is_admin 을 anon 에서 차단
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
