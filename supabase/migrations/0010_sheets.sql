-- ============================================================================
-- 스프레드시트 — sheets / sheet_permissions
-- ----------------------------------------------------------------------------
-- Excel/Google Sheets 형태의 표 계산 문서. documents/mind_maps 모델과 동일한
-- 소유/공유/RLS 구조를 미러링한다. 콘텐츠(셀 데이터, 시트 목록, 서식 등)는
-- @fortune-sheet 의 시트 배열 구조를 그대로 jsonb 로 저장한다.
-- ============================================================================

create table public.sheets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled sheet',
  data jsonb not null default '[]'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sheet_permissions (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.sheets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null check (permission in ('view','edit')),
  granted_by uuid not null references public.profiles(id),
  granted_at timestamptz not null default now(),
  unique (sheet_id, user_id)
);

create trigger sheets_set_updated_at
before update on public.sheets
for each row execute function public.set_updated_at();

alter table public.sheets enable row level security;
alter table public.sheet_permissions enable row level security;

create policy sheets_select on public.sheets for select
using (
  owner_id = auth.uid()
  or is_public = true
  or exists (select 1 from public.sheet_permissions sp where sp.sheet_id = sheets.id and sp.user_id = auth.uid())
  or public.is_admin()
);

create policy sheets_insert on public.sheets for insert
with check (owner_id = auth.uid());

create policy sheets_update on public.sheets for update
using (
  owner_id = auth.uid()
  or exists (select 1 from public.sheet_permissions sp where sp.sheet_id = sheets.id and sp.user_id = auth.uid() and sp.permission = 'edit')
  or public.is_admin()
);

create policy sheets_delete on public.sheets for delete
using (owner_id = auth.uid() or public.is_admin());

create policy sheet_permissions_select on public.sheet_permissions for select
using (
  user_id = auth.uid()
  or exists (select 1 from public.sheets s where s.id = sheet_id and s.owner_id = auth.uid())
  or public.is_admin()
);

create policy sheet_permissions_insert on public.sheet_permissions for insert
with check (
  exists (select 1 from public.sheets s where s.id = sheet_id and s.owner_id = auth.uid())
  or public.is_admin()
);

create policy sheet_permissions_delete on public.sheet_permissions for delete
using (
  exists (select 1 from public.sheets s where s.id = sheet_id and s.owner_id = auth.uid())
  or public.is_admin()
);
