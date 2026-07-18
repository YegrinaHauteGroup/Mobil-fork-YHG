-- ============================================================================
-- 0015 의 search_ontology 버그 수정: UNION ALL 결과에 바로 ORDER BY rank 를
-- 걸면 "rank" 가 어떤 브랜치에서도 명명된 출력 컬럼이 아니라서
-- "invalid UNION/INTERSECT/EXCEPT ORDER BY clause" 에러가 난다(SQL 표준상
-- 집합 연산 직후의 ORDER BY 는 결과 컬럼 이름만 참조 가능, 표현식 불가).
-- UNION ALL 을 서브쿼리로 감싸고 그 결과의 명명된 컬럼(results.rank)을
-- 바깥에서 정렬하도록 수정.
-- ============================================================================

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
    select * from (
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
    ) results
    order by results.rank desc
    limit 30;
end;
$$;

revoke all on function public.search_ontology(text) from public, anon;
grant execute on function public.search_ontology(text) to authenticated;
