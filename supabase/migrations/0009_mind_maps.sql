-- ============================================================================
-- 마인드맵 / 그래프 캔버스 — mind_maps / mind_map_permissions
-- ----------------------------------------------------------------------------
-- 파일·코드·문서를 노드로 배치하고 방향성 간선(상하관계)으로 연결하는 자유
-- 그래프. 전체 그래프 상태(nodes/edges/viewport)는 data(jsonb) 한 컬럼에 저장한다.
-- 소유/공유/RLS 구조는 documents 모델을 그대로 미러링한다.
-- ============================================================================

create table public.mind_maps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled map',
  data jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mind_map_permissions (
  id uuid primary key default gen_random_uuid(),
  mind_map_id uuid not null references public.mind_maps(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null check (permission in ('view','edit')),
  granted_by uuid not null references public.profiles(id),
  granted_at timestamptz not null default now(),
  unique (mind_map_id, user_id)
);

create trigger mind_maps_set_updated_at
before update on public.mind_maps
for each row execute function public.set_updated_at();

alter table public.mind_maps enable row level security;
alter table public.mind_map_permissions enable row level security;

create policy mind_maps_select on public.mind_maps for select
using (
  owner_id = auth.uid()
  or is_public = true
  or exists (select 1 from public.mind_map_permissions mp where mp.mind_map_id = mind_maps.id and mp.user_id = auth.uid())
  or public.is_admin()
);

create policy mind_maps_insert on public.mind_maps for insert
with check (owner_id = auth.uid());

create policy mind_maps_update on public.mind_maps for update
using (
  owner_id = auth.uid()
  or exists (select 1 from public.mind_map_permissions mp where mp.mind_map_id = mind_maps.id and mp.user_id = auth.uid() and mp.permission = 'edit')
  or public.is_admin()
);

create policy mind_maps_delete on public.mind_maps for delete
using (owner_id = auth.uid() or public.is_admin());

create policy mind_map_permissions_select on public.mind_map_permissions for select
using (
  user_id = auth.uid()
  or exists (select 1 from public.mind_maps m where m.id = mind_map_id and m.owner_id = auth.uid())
  or public.is_admin()
);

create policy mind_map_permissions_insert on public.mind_map_permissions for insert
with check (
  exists (select 1 from public.mind_maps m where m.id = mind_map_id and m.owner_id = auth.uid())
  or public.is_admin()
);

create policy mind_map_permissions_delete on public.mind_map_permissions for delete
using (
  exists (select 1 from public.mind_maps m where m.id = mind_map_id and m.owner_id = auth.uid())
  or public.is_admin()
);
