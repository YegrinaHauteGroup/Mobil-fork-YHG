-- ============================================================================
-- 온톨로지 시맨틱 레이어: 콘텐츠 간 링크 그래프 + 통합 전문 검색
-- ----------------------------------------------------------------------------
-- Objects(문서/코드/시트/마인드맵/파일)와 Properties(각 테이블 컬럼)는 이미
-- 존재한다. 빠져 있던 건 Links — 지금은 마인드맵 하나의 JSON(data.edges,
-- ref 노드) 안에 갇혀 다른 화면·검색에서 보이지 않는다. object_links 로
-- 꺼내 전역적으로 조회 가능하게 만들고, 5개 콘텐츠 테이블에 전문 검색
-- 인덱스를 추가해 헤더 검색에서 통합 검색 + 연결된 항목을 함께 보여준다.
-- ============================================================================

-- ---------- Tiptap JSON에서 순수 텍스트만 뽑아내는 헬퍼(검색 색인용) ----------
create or replace function public.jsonb_extract_text(node jsonb)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  result text := '';
  child jsonb;
begin
  if node is null then
    return '';
  end if;
  if jsonb_typeof(node) = 'object' then
    if node ? 'text' and jsonb_typeof(node->'text') = 'string' then
      result := result || (node->>'text') || ' ';
    end if;
    if node ? 'content' and jsonb_typeof(node->'content') = 'array' then
      for child in select * from jsonb_array_elements(node->'content') loop
        result := result || public.jsonb_extract_text(child);
      end loop;
    end if;
  elsif jsonb_typeof(node) = 'array' then
    for child in select * from jsonb_array_elements(node) loop
      result := result || public.jsonb_extract_text(child);
    end loop;
  end if;
  return result;
end;
$$;

-- ---------- 전문 검색 인덱스 ----------
-- 'simple' 설정을 일관되게 사용(색인·질의 양쪽) — 코드 식별자·한글 혼용
-- 콘텐츠에 영어 어간 추출(stemming)이 오히려 방해가 됨.
alter table public.documents
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', public.jsonb_extract_text(content)), 'B')
  ) stored;
create index documents_search_idx on public.documents using gin (search_vector);

alter table public.code_files
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(content, '')), 'B')
  ) stored;
create index code_files_search_idx on public.code_files using gin (search_vector);

-- 시트(셀 그리드)·마인드맵(그래프)은 구조가 복잡해 1차 버전은 제목만 색인한다.
-- 필요 시 celldata/노드 라벨을 뽑는 전용 추출 함수를 추가해 확장 가능.
alter table public.sheets
  add column search_vector tsvector
  generated always as (setweight(to_tsvector('simple', coalesce(title, '')), 'A')) stored;
create index sheets_search_idx on public.sheets using gin (search_vector);

alter table public.mind_maps
  add column search_vector tsvector
  generated always as (setweight(to_tsvector('simple', coalesce(title, '')), 'A')) stored;
create index mind_maps_search_idx on public.mind_maps using gin (search_vector);

alter table public.files
  add column search_vector tsvector
  generated always as (setweight(to_tsvector('simple', coalesce(file_name, '')), 'A')) stored;
create index files_search_idx on public.files using gin (search_vector);

-- ---------- 링크 그래프 ----------
create table public.object_links (
  id uuid primary key default gen_random_uuid(),
  -- 이 관계 묶음을 만든 주체(재동기화 시 delete 기준) 예: 'mindmap:<id>', 'doc:<id>'
  source text not null,
  from_kind text not null check (from_kind in ('document', 'code', 'sheet', 'mindmap', 'file')),
  from_id uuid not null,
  to_kind text not null check (to_kind in ('document', 'code', 'sheet', 'mindmap', 'file')),
  to_id uuid not null,
  created_at timestamptz not null default now()
);
create index object_links_source_idx on public.object_links (source);
create index object_links_from_idx on public.object_links (from_kind, from_id);
create index object_links_to_idx on public.object_links (to_kind, to_id);

-- 폴리모픽 대상(5개 테이블 중 하나)이라 단일 FK로 무결성을 강제할 수 없고,
-- from/to 각각 어떤 테이블인지에 따라 다른 RLS 정책을 적용해야 하므로 직접
-- 접근은 전면 차단하고 아래 SECURITY DEFINER 함수로만 읽고 쓴다.
alter table public.object_links enable row level security;
create policy object_links_no_direct_access on public.object_links for all using (false);

-- ---------- 권한 판별 공통 헬퍼 ----------
-- 5개 테이블의 select 정책(owner or public or 개별 permission or admin)을
-- 그대로 반영한다. link 조회/삭제 시 대상 오브젝트별로 재검증하는 데 쓴다.
create or replace function public.can_view_object(p_kind text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if p_kind = 'document' then
    return exists(
      select 1 from public.documents d
      where d.id = p_id
        and (d.owner_id = auth.uid() or d.is_public
             or exists(select 1 from public.document_permissions dp where dp.document_id = d.id and dp.user_id = auth.uid())
             or public.is_admin())
    );
  elsif p_kind = 'code' then
    return exists(
      select 1 from public.code_files c
      where c.id = p_id
        and (c.owner_id = auth.uid() or c.is_public
             or exists(select 1 from public.code_file_permissions cp where cp.code_file_id = c.id and cp.user_id = auth.uid())
             or public.is_admin())
    );
  elsif p_kind = 'sheet' then
    return exists(
      select 1 from public.sheets s
      where s.id = p_id
        and (s.owner_id = auth.uid() or s.is_public
             or exists(select 1 from public.sheet_permissions sp where sp.sheet_id = s.id and sp.user_id = auth.uid())
             or public.is_admin())
    );
  elsif p_kind = 'mindmap' then
    return exists(
      select 1 from public.mind_maps m
      where m.id = p_id
        and (m.owner_id = auth.uid() or m.is_public
             or exists(select 1 from public.mind_map_permissions mp where mp.mind_map_id = m.id and mp.user_id = auth.uid())
             or public.is_admin())
    );
  elsif p_kind = 'file' then
    return exists(
      select 1 from public.files f
      where f.id = p_id
        and (f.owner_id = auth.uid() or f.is_public
             or exists(select 1 from public.file_permissions fp where fp.file_id = f.id and fp.user_id = auth.uid())
             or public.is_admin())
    );
  else
    return false;
  end if;
end;
$$;

revoke all on function public.can_view_object(text, uuid) from public, anon;
grant execute on function public.can_view_object(text, uuid) to authenticated;

-- ---------- 링크 동기화(저장 시 호출) ----------
-- p_from_kind/p_from_id 를 편집할 수 있어야 애초에 saveDocument/saveMindMap
-- 이 성공했을 것이므로 can_view_object 는 방어적 재검증 성격이다.
create or replace function public.sync_object_links(
  p_source text,
  p_from_kind text,
  p_from_id uuid,
  p_links jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link jsonb;
begin
  if not public.can_view_object(p_from_kind, p_from_id) then
    raise exception 'not_authorized';
  end if;

  delete from public.object_links where source = p_source;

  if p_links is null then
    return;
  end if;

  for v_link in select * from jsonb_array_elements(p_links) loop
    insert into public.object_links (source, from_kind, from_id, to_kind, to_id)
    values (p_source, p_from_kind, p_from_id, v_link->>'to_kind', (v_link->>'to_id')::uuid);
  end loop;
end;
$$;

revoke all on function public.sync_object_links(text, text, uuid, jsonb) from public, anon;
grant execute on function public.sync_object_links(text, text, uuid, jsonb) to authenticated;

-- 오브젝트 삭제 시 호출 — 자신이 만든 링크 + 자신을 가리키는 링크를 모두 제거.
create or replace function public.cleanup_object_links(p_kind text, p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.object_links
  where (from_kind = p_kind and from_id = p_id)
     or (to_kind = p_kind and to_id = p_id);
$$;

revoke all on function public.cleanup_object_links(text, uuid) from public, anon;
grant execute on function public.cleanup_object_links(text, uuid) to authenticated;

-- ---------- 연결된 오브젝트 조회 ----------
create or replace function public.get_linked_objects(p_kind text, p_id uuid)
returns table(kind text, id uuid, title text, link_source text)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.can_view_object(p_kind, p_id) then
    return;
  end if;

  return query
    with neighbors as (
      select to_kind as n_kind, to_id as n_id, source as n_source
        from public.object_links
        where from_kind = p_kind and from_id = p_id
      union
      select from_kind as n_kind, from_id as n_id, source as n_source
        from public.object_links
        where to_kind = p_kind and to_id = p_id
    )
    select n.n_kind, n.n_id,
           case n.n_kind
             when 'document' then (select d.title from public.documents d where d.id = n.n_id)
             when 'code' then (select c.name from public.code_files c where c.id = n.n_id)
             when 'sheet' then (select s.title from public.sheets s where s.id = n.n_id)
             when 'mindmap' then (select m.title from public.mind_maps m where m.id = n.n_id)
             when 'file' then (select f.file_name from public.files f where f.id = n.n_id)
           end,
           n.n_source
      from neighbors n
      where public.can_view_object(n.n_kind, n.n_id)
        and case n.n_kind
              when 'document' then exists(select 1 from public.documents d where d.id = n.n_id)
              when 'code' then exists(select 1 from public.code_files c where c.id = n.n_id)
              when 'sheet' then exists(select 1 from public.sheets s where s.id = n.n_id)
              when 'mindmap' then exists(select 1 from public.mind_maps m where m.id = n.n_id)
              when 'file' then exists(select 1 from public.files f where f.id = n.n_id)
            end;
end;
$$;

revoke all on function public.get_linked_objects(text, uuid) from public, anon;
grant execute on function public.get_linked_objects(text, uuid) to authenticated;

-- ---------- 통합 검색 ----------
-- SECURITY DEFINER 가 아님(기본 INVOKER) — 호출한 사용자 권한으로 각 테이블을
-- 그대로 select 하므로 기존 RLS 정책이 자동으로 결과를 필터링한다.
create or replace function public.search_ontology(p_query text)
returns table(kind text, id uuid, title text, snippet text, rank real, updated_at timestamptz)
language plpgsql
stable
set search_path = public
as $$
declare
  v_tsquery tsquery;
begin
  if p_query is null or length(trim(p_query)) = 0 then
    return;
  end if;

  v_tsquery := websearch_to_tsquery('simple', p_query);
  if v_tsquery is null then
    return;
  end if;

  return query
    select 'document'::text, d.id, d.title,
           left(public.jsonb_extract_text(d.content), 200),
           ts_rank(d.search_vector, v_tsquery),
           d.updated_at
      from public.documents d
      where d.search_vector @@ v_tsquery
    union all
    select 'code'::text, c.id, c.name,
           left(c.content, 200),
           ts_rank(c.search_vector, v_tsquery),
           c.updated_at
      from public.code_files c
      where c.search_vector @@ v_tsquery
    union all
    select 'sheet'::text, s.id, s.title, ''::text,
           ts_rank(s.search_vector, v_tsquery),
           s.updated_at
      from public.sheets s
      where s.search_vector @@ v_tsquery
    union all
    select 'mindmap'::text, m.id, m.title, ''::text,
           ts_rank(m.search_vector, v_tsquery),
           m.updated_at
      from public.mind_maps m
      where m.search_vector @@ v_tsquery
    union all
    select 'file'::text, f.id, f.file_name, coalesce(f.mime_type, ''),
           ts_rank(f.search_vector, v_tsquery),
           f.created_at
      from public.files f
      where f.search_vector @@ v_tsquery
    order by rank desc
    limit 30;
end;
$$;

revoke all on function public.search_ontology(text) from public, anon;
grant execute on function public.search_ontology(text) to authenticated;
