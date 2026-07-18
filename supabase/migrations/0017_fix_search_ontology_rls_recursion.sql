-- ============================================================================
-- search_ontology 가 SECURITY INVOKER 로 documents/document_permissions 를
-- 직접 select 하면 "infinite recursion detected in policy for relation
-- documents" 에러가 난다. 원인은 0001(지시서 verbatim, 수정 불가)의
-- documents_select 정책이 document_permissions 를 서브쿼리하고,
-- document_permissions_select 정책이 다시 documents 를 서브쿼리하는
-- 상호 순환 구조 — 지금까지는 이 순환이 실제로 발동하는 조회 경로가 없어서
-- 드러나지 않았을 뿐이다(list 페이지 등은 documents 단독 조회만 함).
--
-- 근본 수정: search_ontology 를 SECURITY DEFINER 로 바꿔 RLS 평가 자체를
-- 우회하고, get_linked_objects 와 동일하게 can_view_object() 로 행 단위
-- 가시성을 명시적으로 재검증한다(can_view_object 역시 SECURITY DEFINER 라
-- 같은 순환을 타지 않음 — 이미 검증된 패턴).
-- ============================================================================

create or replace function public.search_ontology(p_query text)
returns table(kind text, id uuid, title text, snippet text, rank real, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
stable
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
    select r.kind, r.id, r.title, r.snippet, r.rank, r.updated_at
    from (
      select 'document'::text as kind, d.id, d.title,
             left(public.jsonb_extract_text(d.content), 200) as snippet,
             ts_rank(d.search_vector, v_tsquery) as rank,
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
    ) r
    where public.can_view_object(r.kind, r.id)
    order by r.rank desc
    limit 30;
end;
$$;

revoke all on function public.search_ontology(text) from public, anon;
grant execute on function public.search_ontology(text) to authenticated;
