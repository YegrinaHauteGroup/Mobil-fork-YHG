-- ============================================================================
-- 고아 미디어 정리 (에디터에서 업로드했지만 어떤 문서에도 더 이상 참조되지
-- 않는 media 버킷 오브젝트 — 이미지를 올렸다 지우거나 문서 자체를 삭제한
-- 경우 등). storage.objects 는 RLS 가 걸려 있고 media 버킷에는 아직 SELECT
-- 정책이 없어(0008 은 insert/delete 만 둠) 목록 조회가 항상 빈 배열이었다.
-- ============================================================================

create policy storage_media_select on storage.objects for select
using (
  bucket_id = 'media'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

-- documents.content(Tiptap JSON)를 텍스트로 캐스팅해 오브젝트 경로 포함 여부로
-- 참조 여부를 판별한다(공개 URL 에 경로가 그대로 들어가므로 충분히 안전).
-- 관리자 전용 — is_admin() 가드.
create or replace function public.admin_orphaned_media()
returns table(name text, bytes bigint, created_at timestamptz)
language plpgsql
security definer
set search_path = public, storage
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  return query
    select o.name,
           coalesce((o.metadata->>'size')::bigint, 0)::bigint,
           o.created_at
      from storage.objects o
      where o.bucket_id = 'media'
        and not exists (
          select 1 from public.documents d
          where d.content::text like '%' || o.name || '%'
        );
end;
$$;

revoke all on function public.admin_orphaned_media() from public, anon;
grant execute on function public.admin_orphaned_media() to authenticated;
