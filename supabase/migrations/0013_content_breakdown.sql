-- ============================================================================
-- 콘텐츠 종류별 사용량 세분화 (대시보드 스토리지 차트용)
-- ----------------------------------------------------------------------------
-- my_storage_usage()/platform_storage_usage() 는 Storage 버킷(files/media)
-- 바이트만 집계한다. 문서·코드·시트·마인드맵은 오브젝트 스토리지가 아니라
-- Postgres 행(jsonb/text 컬럼)에 저장되므로 별도 바이트 측정이 필요하다.
-- 사용자 입장에서는 "내 모든 것"이 하나의 스토리지처럼 보이므로, 여섯 종류
-- (files, media, documents, code, sheets, mindmaps)를 하나의 통합 결과로
-- 반환하는 함수를 둔다. octet_length() 는 UTF-8 바이트 수를 정확히 반환한다
-- (length() 는 문자 수이므로 멀티바이트 문자에서 부정확함).
-- ============================================================================

create or replace function public.my_content_breakdown()
returns table(category text, bytes bigint, item_count bigint)
language plpgsql
security definer
set search_path = public, storage
stable
as $$
declare
  v_uid uuid := auth.uid();
begin
  return query
    select 'files'::text,
           coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint,
           count(*)::bigint
      from storage.objects o
      where o.bucket_id = 'files' and o.owner_id = v_uid::text
    union all
    select 'media'::text,
           coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint,
           count(*)::bigint
      from storage.objects o
      where o.bucket_id = 'media' and o.owner_id = v_uid::text
    union all
    select 'documents'::text,
           coalesce(sum(octet_length(d.content::text)), 0)::bigint,
           count(*)::bigint
      from public.documents d
      where d.owner_id = v_uid
    union all
    select 'code'::text,
           coalesce(sum(octet_length(c.content)), 0)::bigint,
           count(*)::bigint
      from public.code_files c
      where c.owner_id = v_uid
    union all
    select 'sheets'::text,
           coalesce(sum(octet_length(s.data::text)), 0)::bigint,
           count(*)::bigint
      from public.sheets s
      where s.owner_id = v_uid
    union all
    select 'mindmaps'::text,
           coalesce(sum(octet_length(m.data::text)), 0)::bigint,
           count(*)::bigint
      from public.mind_maps m
      where m.owner_id = v_uid;
end;
$$;

revoke all on function public.my_content_breakdown() from public, anon;
grant execute on function public.my_content_breakdown() to authenticated;

-- 플랫폼 전체 합계(카테고리별) — 개인 정보 없이 총량만 반환하므로 인증 사용자
-- 누구나 호출 가능(자신의 비중 계산용).
create or replace function public.platform_content_breakdown()
returns table(category text, bytes bigint, item_count bigint)
language sql
security definer
set search_path = public, storage
stable
as $$
  select 'files'::text,
         coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint,
         count(*)::bigint
    from storage.objects o where o.bucket_id = 'files'
  union all
  select 'media'::text,
         coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint,
         count(*)::bigint
    from storage.objects o where o.bucket_id = 'media'
  union all
  select 'documents'::text,
         coalesce(sum(octet_length(d.content::text)), 0)::bigint,
         count(*)::bigint
    from public.documents d
  union all
  select 'code'::text,
         coalesce(sum(octet_length(c.content)), 0)::bigint,
         count(*)::bigint
    from public.code_files c
  union all
  select 'sheets'::text,
         coalesce(sum(octet_length(s.data::text)), 0)::bigint,
         count(*)::bigint
    from public.sheets s
  union all
  select 'mindmaps'::text,
         coalesce(sum(octet_length(m.data::text)), 0)::bigint,
         count(*)::bigint
    from public.mind_maps m;
$$;

revoke all on function public.platform_content_breakdown() from public, anon;
grant execute on function public.platform_content_breakdown() to authenticated;
