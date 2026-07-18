-- ============================================================================
-- Contributor 추적 — 소유자가 아닌 사용자가 콘텐츠를 저장(수정)하면 자동으로
-- "Contributor" 로 기록한다. object_tags(0021)와 동일한 폴리모픽 패턴이며,
-- 클라이언트 직접 접근은 전면 차단하고 트리거(SECURITY DEFINER, 테이블 소유자
-- 권한으로 RLS 우회)와 조회 RPC만 허용한다.
-- ============================================================================

create table public.content_contributors (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('document', 'code', 'sheet', 'mindmap')),
  object_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  first_contributed_at timestamptz not null default now(),
  unique (kind, object_id, user_id)
);
create index content_contributors_object_idx on public.content_contributors (kind, object_id);

alter table public.content_contributors enable row level security;

-- 해당 콘텐츠를 볼 수 있는 사람만 기여자 목록을 볼 수 있다(오브젝트 자체의
-- 가시성 규칙을 그대로 재사용). insert/update/delete 정책은 두지 않으므로
-- RLS 기본값(전면 거부)이 적용되고, 트리거만 SECURITY DEFINER 로 기록한다.
create policy content_contributors_select on public.content_contributors for select
using (public.can_view_object(kind, object_id));

create or replace function public.track_contributor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
begin
  v_kind := case TG_TABLE_NAME
    when 'documents' then 'document'
    when 'code_files' then 'code'
    when 'sheets' then 'sheet'
    when 'mind_maps' then 'mindmap'
  end;

  if auth.uid() is not null and auth.uid() <> new.owner_id then
    insert into public.content_contributors (kind, object_id, user_id)
    values (v_kind, new.id, auth.uid())
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger documents_track_contributor
after update on public.documents
for each row execute function public.track_contributor();

create trigger code_files_track_contributor
after update on public.code_files
for each row execute function public.track_contributor();

create trigger sheets_track_contributor
after update on public.sheets
for each row execute function public.track_contributor();

create trigger mind_maps_track_contributor
after update on public.mind_maps
for each row execute function public.track_contributor();

-- ---------- 편집기 화면에서 호출: 기여자 목록 조회 ----------
create or replace function public.get_content_contributors(p_kind text, p_id uuid)
returns table(
  user_id uuid,
  display_name text,
  email text,
  avatar_url text,
  first_contributed_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.can_view_object(p_kind, p_id) then
    raise exception 'not_authorized';
  end if;

  return query
    select p.id, p.display_name, p.email, p.avatar_url, cc.first_contributed_at
    from public.content_contributors cc
    join public.profiles p on p.id = cc.user_id
    where cc.kind = p_kind and cc.object_id = p_id
    order by cc.first_contributed_at asc;
end;
$$;

revoke all on function public.get_content_contributors(text, uuid) from public, anon;
grant execute on function public.get_content_contributors(text, uuid) to authenticated;
