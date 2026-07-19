-- 계정별 즐겨찾기(Star). Repository(file)/Table(sheet)/Docs(document)/Code(code)
-- 목록에서 항목을 별표 표시할 수 있게 한다 — 공유 개념 없이 순전히 "나만"
-- 보고 관리하는 개인 설정이라 RLS 는 owner-only 로 충분하다(공유 대상자와도
-- 공유되지 않는다).

create table public.starred_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('document', 'code', 'sheet', 'file')),
  object_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, object_id)
);

create index starred_items_user_kind_idx on public.starred_items (user_id, kind);

alter table public.starred_items enable row level security;

create policy starred_items_select on public.starred_items
  for select using (user_id = (select auth.uid()));

create policy starred_items_insert on public.starred_items
  for insert with check (user_id = (select auth.uid()));

create policy starred_items_delete on public.starred_items
  for delete using (user_id = (select auth.uid()));
