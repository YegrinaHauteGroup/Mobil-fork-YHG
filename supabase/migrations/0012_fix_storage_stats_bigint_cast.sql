-- ============================================================================
-- 0011 의 bigint 캐스팅 오류 수정
-- ----------------------------------------------------------------------------
-- 근본 원인: PostgreSQL 의 sum(bigint) 는 오버플로 방지를 위해 numeric 을
-- 반환한다(bigint 가 아님). 0011 의 세 함수는 반환 테이블 컬럼을 bigint 로
-- 선언했는데 coalesce(sum(...), 0) 의 실제 런타임 타입은 numeric 이라
-- "structure of query does not match function result type" 오류가 발생했다
-- (테스트 중 실제로 재현·확인함). sum 결과에 명시적으로 ::bigint 를 씌워
-- 시정한다.
-- ============================================================================

create or replace function public.my_storage_usage()
returns table(bucket_id text, bytes bigint, file_count bigint)
language sql
security definer
set search_path = public, storage
stable
as $$
  select
    o.bucket_id,
    coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint as bytes,
    count(*) as file_count
  from storage.objects o
  where o.owner_id = auth.uid()::text
  group by o.bucket_id;
$$;

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
      (select coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint
         from storage.objects o
         where o.owner_id = p.id::text)
    from public.profiles p
    order by p.created_at desc;
end;
$$;

create or replace function public.platform_storage_usage()
returns table(bucket_id text, bytes bigint, file_count bigint)
language sql
security definer
set search_path = public, storage
stable
as $$
  select
    o.bucket_id,
    coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint as bytes,
    count(*) as file_count
  from storage.objects o
  group by o.bucket_id;
$$;
