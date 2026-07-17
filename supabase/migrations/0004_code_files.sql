-- ============================================================================
-- 온라인 코드 에디터 — code_files / code_file_permissions
-- ----------------------------------------------------------------------------
-- 문서(documents) 모델과 동일한 소유/공유/RLS 구조를 그대로 미러링한다.
-- 콘텐츠는 평문 텍스트(text) 로 저장한다(코드 원문). 공용 함수 set_updated_at(),
-- is_admin() 은 0001 에서 정의한 것을 재사용한다(재정의 금지 원칙 준수).
-- ============================================================================

-- ============ code_files ============
create table public.code_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'untitled.txt',
  language text not null default 'plaintext',
  content text not null default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.code_file_permissions (
  id uuid primary key default gen_random_uuid(),
  code_file_id uuid not null references public.code_files(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null check (permission in ('view','edit')),
  granted_by uuid not null references public.profiles(id),
  granted_at timestamptz not null default now(),
  unique (code_file_id, user_id)
);

create trigger code_files_set_updated_at
before update on public.code_files
for each row execute function public.set_updated_at();

-- ============ 감사 로그 대상 유형에 'code' 추가 ============
-- 0001 의 audit_logs.target_type 체크 제약을 확장한다(0001 파일 자체는 불변).
alter table public.audit_logs
  drop constraint audit_logs_target_type_check;
alter table public.audit_logs
  add constraint audit_logs_target_type_check
  check (target_type in ('document','file','code'));

-- ============ RLS 활성화 ============
alter table public.code_files enable row level security;
alter table public.code_file_permissions enable row level security;

-- code_files (documents 정책과 동일)
create policy code_files_select on public.code_files for select
using (
  owner_id = auth.uid()
  or is_public = true
  or exists (select 1 from public.code_file_permissions cp where cp.code_file_id = code_files.id and cp.user_id = auth.uid())
  or public.is_admin()
);

create policy code_files_insert on public.code_files for insert
with check (owner_id = auth.uid());

create policy code_files_update on public.code_files for update
using (
  owner_id = auth.uid()
  or exists (select 1 from public.code_file_permissions cp where cp.code_file_id = code_files.id and cp.user_id = auth.uid() and cp.permission = 'edit')
  or public.is_admin()
);

create policy code_files_delete on public.code_files for delete
using (owner_id = auth.uid() or public.is_admin());

-- code_file_permissions (document_permissions 정책과 동일)
create policy code_file_permissions_select on public.code_file_permissions for select
using (
  user_id = auth.uid()
  or exists (select 1 from public.code_files c where c.id = code_file_id and c.owner_id = auth.uid())
  or public.is_admin()
);

create policy code_file_permissions_insert on public.code_file_permissions for insert
with check (
  exists (select 1 from public.code_files c where c.id = code_file_id and c.owner_id = auth.uid())
  or public.is_admin()
);

create policy code_file_permissions_delete on public.code_file_permissions for delete
using (
  exists (select 1 from public.code_files c where c.id = code_file_id and c.owner_id = auth.uid())
  or public.is_admin()
);
