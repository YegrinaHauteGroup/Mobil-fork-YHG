-- ============================================================================
-- 문서 에디터용 미디어 버킷 (이미지/동영상 임베드)
-- ----------------------------------------------------------------------------
-- 문서에 임베드된 이미지·동영상은 지속적으로 접근 가능한 URL 이 필요하다(서명 URL
-- 은 만료됨). 따라서 공개 읽기(public read) 버킷 `media` 를 둔다. 업로드는
-- 소유자 폴더({uid}/...)로만 허용하고, 삭제는 소유자/관리자만 가능하다.
-- 공개 버킷이므로 URL 을 아는 사람은 파일을 볼 수 있다(문서 임베드 특성상 필요).
-- 민감 원본 파일은 계속 비공개 `files` 버킷을 사용한다.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy storage_media_insert on storage.objects for insert
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy storage_media_delete on storage.objects for delete
using (
  bucket_id = 'media'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
