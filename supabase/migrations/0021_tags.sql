-- ============================================================================
-- #태그 시스템 — object_links 와 동일한 폴리모픽 패턴으로 태그 그래프를 둔다.
-- ----------------------------------------------------------------------------
-- 콘텐츠 본문/제목에서 "#단어" 토큰을 뽑아 tags/object_tags 에 동기화한다
-- (추출 자체는 Next.js 서버 액션에서 lib/tags.ts 로 처리하고, 이 마이그레이션은
-- 저장·조회·정리를 위한 SECURITY DEFINER 함수만 제공한다). object_links 와
-- 마찬가지로 두 테이블에 대한 직접 접근은 전면 차단하고 함수 경유만 허용한다.
-- ============================================================================

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.object_tags (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.tags(id) on delete cascade,
  kind text not null check (kind in ('document', 'code', 'sheet', 'mindmap', 'file')),
  object_id uuid not null,
  created_at timestamptz not null default now(),
  unique (tag_id, kind, object_id)
);
create index object_tags_object_idx on public.object_tags (kind, object_id);
create index object_tags_tag_idx on public.object_tags (tag_id);

alter table public.tags enable row level security;
alter table public.object_tags enable row level security;
create policy tags_no_direct_access on public.tags for all using (false);
create policy object_tags_no_direct_access on public.object_tags for all using (false);

-- ---------- 저장 시 호출: 오브젝트의 태그 집합을 통째로 교체 ----------
create or replace function public.sync_object_tags(p_kind text, p_id uuid, p_tag_names text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tag_id uuid;
  v_name text;
  v_normalized text[];
begin
  if not public.can_view_object(p_kind, p_id) then
    raise exception 'not_authorized';
  end if;

  delete from public.object_tags where kind = p_kind and object_id = p_id;

  if p_tag_names is null then
    return;
  end if;

  select array_agg(distinct lower(trim(t))) into v_normalized
    from unnest(p_tag_names) as t
    where length(trim(t)) > 0;

  if v_normalized is null then
    return;
  end if;

  foreach v_name in array v_normalized loop
    insert into public.tags (name) values (v_name)
      on conflict (name) do nothing;

    select id into v_tag_id from public.tags where name = v_name;

    insert into public.object_tags (tag_id, kind, object_id)
    values (v_tag_id, p_kind, p_id)
    on conflict do nothing;
  end loop;
end;
$$;

revoke all on function public.sync_object_tags(text, uuid, text[]) from public, anon;
grant execute on function public.sync_object_tags(text, uuid, text[]) to authenticated;

-- ---------- 오브젝트 삭제 시 호출 ----------
create or replace function public.cleanup_object_tags(p_kind text, p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.object_tags where kind = p_kind and object_id = p_id;
$$;

revoke all on function public.cleanup_object_tags(text, uuid) from public, anon;
grant execute on function public.cleanup_object_tags(text, uuid) to authenticated;

-- ---------- 검색창의 #태그 조회 ----------
create or replace function public.search_by_tag(p_tag text)
returns table(kind text, id uuid, title text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_name text := lower(trim(both '#' from trim(p_tag)));
begin
  if v_name is null or length(v_name) = 0 then
    return;
  end if;

  return query
    select
      ot.kind,
      ot.object_id,
      case ot.kind
        when 'document' then (select d.title from public.documents d where d.id = ot.object_id)
        when 'code' then (select c.name from public.code_files c where c.id = ot.object_id)
        when 'sheet' then (select s.title from public.sheets s where s.id = ot.object_id)
        when 'mindmap' then (select m.title from public.mind_maps m where m.id = ot.object_id)
        when 'file' then (select f.file_name from public.files f where f.id = ot.object_id)
      end as title,
      case ot.kind
        when 'document' then (select d.updated_at from public.documents d where d.id = ot.object_id)
        when 'code' then (select c.updated_at from public.code_files c where c.id = ot.object_id)
        when 'sheet' then (select s.updated_at from public.sheets s where s.id = ot.object_id)
        when 'mindmap' then (select m.updated_at from public.mind_maps m where m.id = ot.object_id)
        when 'file' then (select f.created_at from public.files f where f.id = ot.object_id)
      end as updated_at
    from public.object_tags ot
    join public.tags t on t.id = ot.tag_id
    where t.name = v_name
      and public.can_view_object(ot.kind, ot.object_id)
    order by 4 desc nulls last
    limit 50;
end;
$$;

revoke all on function public.search_by_tag(text) from public, anon;
grant execute on function public.search_by_tag(text) to authenticated;

-- ---------- 목록 화면에서 배지로 표시할 태그 일괄 조회 ----------
create or replace function public.get_object_tags_bulk(p_kind text, p_ids uuid[])
returns table(object_id uuid, tag_name text)
language sql
security definer
set search_path = public
stable
as $$
  select ot.object_id, t.name
  from public.object_tags ot
  join public.tags t on t.id = ot.tag_id
  where ot.kind = p_kind and ot.object_id = any(p_ids);
$$;

revoke all on function public.get_object_tags_bulk(text, uuid[]) from public, anon;
grant execute on function public.get_object_tags_bulk(text, uuid[]) to authenticated;
