-- ============================================================================
-- 스토리지 사용량 · 관리자 사용자 현황 집계 함수
-- ----------------------------------------------------------------------------
-- 스토리지는 사용자별 쿼터 없이 전 사용자가 하나의 버킷 세트(files/media)를
-- 공유한다. 대시보드에 "내 사용량"과 "전체 대비 비중"을 보여주기 위해, 그리고
-- 관리자 콘솔에 사용자별 콘텐츠/용량 현황을 보여주기 위해 SECURITY DEFINER
-- 집계 함수 두 개를 둔다. storage.objects 는 RLS 가 있어 클라이언트가 직접
-- group by 집계를 하기 어렵고(파일마다 낱개 행을 모두 읽어야 함), 이 함수들은
-- DB 내부에서 집계해 필요한 결과만 반환한다.
--
-- 각 파일 버킷 업로드 시 Storage API 가 storage.objects.owner_id 를 업로더의
-- auth.uid() 로 자동 설정하므로 이를 기준으로 삼는다(경로 규칙 파싱보다 견고).
-- ============================================================================

-- 호출한 사용자 본인의 버킷별 사용량.
create or replace function public.my_storage_usage()
returns table(bucket_id text, bytes bigint, file_count bigint)
language sql
security definer
set search_path = public, storage
stable
as $$
  select
    o.bucket_id,
    coalesce(sum((o.metadata->>'size')::bigint), 0) as bytes,
    count(*) as file_count
  from storage.objects o
  where o.owner_id = auth.uid()::text
  group by o.bucket_id;
$$;

revoke all on function public.my_storage_usage() from public, anon;
grant execute on function public.my_storage_usage() to authenticated;

-- 관리자 전용: 전체 사용자의 프로필 + 콘텐츠 개수 + 스토리지 사용량 한 번에 조회.
create or replace function public.admin_user_overview()
returns table(
  id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz,
  documents_count bigint,
  files_count bigint,
  code_count bigint,
  sheets_count bigint,
  maps_count bigint,
  storage_bytes bigint
)
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
    select
      p.id,
      p.email,
      p.display_name,
      p.role,
      p.created_at,
      (select count(*) from public.documents d where d.owner_id = p.id),
      (select count(*) from public.files f where f.owner_id = p.id),
      (select count(*) from public.code_files c where c.owner_id = p.id),
      (select count(*) from public.sheets s where s.owner_id = p.id),
      (select count(*) from public.mind_maps m where m.owner_id = p.id),
      (select coalesce(sum((o.metadata->>'size')::bigint), 0)
         from storage.objects o
         where o.owner_id = p.id::text)
    from public.profiles p
    order by p.created_at desc;
end;
$$;

revoke all on function public.admin_user_overview() from public, anon;
grant execute on function public.admin_user_overview() to authenticated;

-- 관리자 전용: 전체 플랫폼 총 스토리지 사용량(버킷별) — 개인 대시보드의
-- "전체 대비 비중" 계산에 사용. 일반 사용자도 자신의 비중을 보려면 총합이
-- 필요하므로 이 함수는 인증 사용자 누구나 호출 가능하되, 개별 사용자 식별
-- 정보 없이 버킷별 총합만 반환한다(프라이버시 침해 없음).
create or replace function public.platform_storage_usage()
returns table(bucket_id text, bytes bigint, file_count bigint)
language sql
security definer
set search_path = public, storage
stable
as $$
  select
    o.bucket_id,
    coalesce(sum((o.metadata->>'size')::bigint), 0) as bytes,
    count(*) as file_count
  from storage.objects o
  group by o.bucket_id;
$$;

revoke all on function public.platform_storage_usage() from public, anon;
grant execute on function public.platform_storage_usage() to authenticated;
