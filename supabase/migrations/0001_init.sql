create extension if not exists pgcrypto;

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ admin_codes ============
create table public.admin_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  is_used boolean not null default false,
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============ documents ============
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled',
  content jsonb not null default '{}'::jsonb, -- Tiptap JSON
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_permissions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null check (permission in ('view','edit')),
  granted_by uuid not null references public.profiles(id),
  granted_at timestamptz not null default now(),
  unique (document_id, user_id)
);

-- ============ files ============
create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.file_permissions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null check (permission in ('view','edit')),
  granted_by uuid not null references public.profiles(id),
  granted_at timestamptz not null default now(),
  unique (file_id, user_id)
);

-- ============ audit_logs ============
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  target_type text not null check (target_type in ('document','file')),
  target_id uuid not null,
  action text not null check (action in ('view','create','update','delete','download')),
  created_at timestamptz not null default now()
);

-- ============ 공용 함수 ============
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 자기 자신의 role 컬럼 셀프 승격 방지 (redeem_admin_code 함수만 예외)
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role <> old.role and current_user = session_user then
    raise exception 'role_change_not_allowed';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_change
before update on public.profiles
for each row execute function public.prevent_role_change();

-- ============ 관리자 코드 승격/발급 ============
create or replace function public.redeem_admin_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_code_id uuid;
begin
  v_hash := encode(digest(p_code, 'sha256'), 'hex');

  select id into v_code_id
  from public.admin_codes
  where code_hash = v_hash
    and is_used = false
    and (expires_at is null or expires_at > now())
  for update;

  if v_code_id is null then
    raise exception 'invalid_or_used_code';
  end if;

  update public.admin_codes
  set is_used = true, used_by = auth.uid(), used_at = now()
  where id = v_code_id;

  update public.profiles
  set role = 'admin'
  where id = auth.uid();
end;
$$;

revoke all on function public.redeem_admin_code(text) from public;
grant execute on function public.redeem_admin_code(text) to authenticated;

create or replace function public.generate_admin_code(p_expires_at timestamptz default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_hash text;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  v_code := encode(gen_random_bytes(9), 'base64');
  v_hash := encode(digest(v_code, 'sha256'), 'hex');

  insert into public.admin_codes (code_hash, expires_at)
  values (v_hash, p_expires_at);

  return v_code;
end;
$$;

revoke all on function public.generate_admin_code(timestamptz) from public;
grant execute on function public.generate_admin_code(timestamptz) to authenticated;

-- ============ RLS 활성화 ============
alter table public.profiles enable row level security;
alter table public.admin_codes enable row level security;
alter table public.documents enable row level security;
alter table public.document_permissions enable row level security;
alter table public.files enable row level security;
alter table public.file_permissions enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
create policy profiles_select on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles for update
using (id = auth.uid());

-- admin_codes: 클라이언트 직접 접근 전면 차단 (함수 경유만 허용)
create policy admin_codes_no_access on public.admin_codes for all
using (false);

-- documents
create policy documents_select on public.documents for select
using (
  owner_id = auth.uid()
  or is_public = true
  or exists (select 1 from public.document_permissions dp where dp.document_id = documents.id and dp.user_id = auth.uid())
  or public.is_admin()
);

create policy documents_insert on public.documents for insert
with check (owner_id = auth.uid());

create policy documents_update on public.documents for update
using (
  owner_id = auth.uid()
  or exists (select 1 from public.document_permissions dp where dp.document_id = documents.id and dp.user_id = auth.uid() and dp.permission = 'edit')
  or public.is_admin()
);

create policy documents_delete on public.documents for delete
using (owner_id = auth.uid() or public.is_admin());

-- document_permissions
create policy document_permissions_select on public.document_permissions for select
using (
  user_id = auth.uid()
  or exists (select 1 from public.documents d where d.id = document_id and d.owner_id = auth.uid())
  or public.is_admin()
);

create policy document_permissions_insert on public.document_permissions for insert
with check (
  exists (select 1 from public.documents d where d.id = document_id and d.owner_id = auth.uid())
  or public.is_admin()
);

create policy document_permissions_delete on public.document_permissions for delete
using (
  exists (select 1 from public.documents d where d.id = document_id and d.owner_id = auth.uid())
  or public.is_admin()
);

-- files
create policy files_select on public.files for select
using (
  owner_id = auth.uid()
  or is_public = true
  or exists (select 1 from public.file_permissions fp where fp.file_id = files.id and fp.user_id = auth.uid())
  or public.is_admin()
);

create policy files_insert on public.files for insert
with check (owner_id = auth.uid());

create policy files_update on public.files for update
using (owner_id = auth.uid() or public.is_admin());

create policy files_delete on public.files for delete
using (owner_id = auth.uid() or public.is_admin());

-- file_permissions
create policy file_permissions_select on public.file_permissions for select
using (
  user_id = auth.uid()
  or exists (select 1 from public.files f where f.id = file_id and f.owner_id = auth.uid())
  or public.is_admin()
);

create policy file_permissions_insert on public.file_permissions for insert
with check (
  exists (select 1 from public.files f where f.id = file_id and f.owner_id = auth.uid())
  or public.is_admin()
);

create policy file_permissions_delete on public.file_permissions for delete
using (
  exists (select 1 from public.files f where f.id = file_id and f.owner_id = auth.uid())
  or public.is_admin()
);

-- audit_logs
create policy audit_logs_select_admin on public.audit_logs for select
using (public.is_admin());

create policy audit_logs_insert_own on public.audit_logs for insert
with check (user_id = auth.uid());
