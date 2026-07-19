-- ============================================================================
-- 시트/마인드맵 실시간 협업(전체 스냅샷 브로드캐스트) — 채널 접근 통제 확장
-- ----------------------------------------------------------------------------
-- 0029 에서 문서/코드용으로 만든 can_edit_object/realtime_topic_viewable/
-- realtime_topic_editable 를 sheet:/mindmap: 토픽까지 지원하도록 확장한다.
-- 문서/코드처럼 Yjs CRDT 가 아니라 저장할 때마다 전체 데이터를 통째로
-- 브로드캐스트하는 더 단순한 방식이지만, 채널 접근 통제(수신=열람 가능,
-- 발신=편집 가능)는 동일하게 적용해야 한다.
-- ============================================================================

create or replace function public.can_edit_object(p_kind text, p_id uuid)
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
        and (d.owner_id = auth.uid()
             or exists(select 1 from public.document_permissions dp where dp.document_id = d.id and dp.user_id = auth.uid() and dp.permission = 'edit')
             or public.is_admin())
    );
  elsif p_kind = 'code' then
    return exists(
      select 1 from public.code_files c
      where c.id = p_id
        and (c.owner_id = auth.uid()
             or exists(select 1 from public.code_file_permissions cp where cp.code_file_id = c.id and cp.user_id = auth.uid() and cp.permission = 'edit')
             or public.is_admin())
    );
  elsif p_kind = 'sheet' then
    return exists(
      select 1 from public.sheets s
      where s.id = p_id
        and (s.owner_id = auth.uid()
             or exists(select 1 from public.sheet_permissions sp where sp.sheet_id = s.id and sp.user_id = auth.uid() and sp.permission = 'edit')
             or public.is_admin())
    );
  elsif p_kind = 'mindmap' then
    return exists(
      select 1 from public.mind_maps m
      where m.id = p_id
        and (m.owner_id = auth.uid()
             or exists(select 1 from public.mind_map_permissions mp where mp.mind_map_id = m.id and mp.user_id = auth.uid() and mp.permission = 'edit')
             or public.is_admin())
    );
  else
    return false;
  end if;
end;
$$;

create or replace function public.realtime_topic_viewable(p_topic text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if p_topic like 'doc:%' then
    return public.can_view_object('document', substring(p_topic from 5)::uuid);
  elsif p_topic like 'code:%' then
    return public.can_view_object('code', substring(p_topic from 6)::uuid);
  elsif p_topic like 'sheet:%' then
    return public.can_view_object('sheet', substring(p_topic from 7)::uuid);
  elsif p_topic like 'mindmap:%' then
    return public.can_view_object('mindmap', substring(p_topic from 9)::uuid);
  end if;
  return false;
exception when others then
  return false;
end;
$$;

create or replace function public.realtime_topic_editable(p_topic text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if p_topic like 'doc:%' then
    return public.can_edit_object('document', substring(p_topic from 5)::uuid);
  elsif p_topic like 'code:%' then
    return public.can_edit_object('code', substring(p_topic from 6)::uuid);
  elsif p_topic like 'sheet:%' then
    return public.can_edit_object('sheet', substring(p_topic from 7)::uuid);
  elsif p_topic like 'mindmap:%' then
    return public.can_edit_object('mindmap', substring(p_topic from 9)::uuid);
  end if;
  return false;
exception when others then
  return false;
end;
$$;
