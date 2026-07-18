# SaaS 온라인 저장소 플랫폼 구축 지시서

## 프로젝트 개요
Google Drive 유사 SaaS. 사용자는 로그인 후 파일 저장/조회와 문서 작성/편집을 하나의 플랫폼에서 수행한다. 관리자는 별도 코드로 권한을 획득한다.

## 기술 스택
- Next.js (App Router) + Vercel 배포
- Supabase (Postgres, Auth, Storage)
- Tiptap (문서 에디터, JSON 콘텐츠 저장 — HTML 직접 저장 시 XSS 위험이 있어 배제)
- @supabase/ssr로 서버 컴포넌트 인증 처리

## 범위

**이번 단계에 포함:**
1. 일반 회원가입/로그인 (Supabase Auth, email+password)
2. 관리자 코드 입력을 통한 관리자 권한 승격
3. 파일 저장소 (업로드/다운로드/목록/삭제, 공유 권한)
4. 문서 편집기 (생성/조회/수정, 공유 권한)

**이번 단계에서 제외 (구현하지 말 것):**
- 실시간 협업 (Yjs 등)
- 온라인 코드 에디터 (Monaco)
- 폴더 계층 구조
- 확인 없이 위 항목을 임의로 추가하지 말 것

## 작업 원칙 (필독)
- 아래 SQL은 verbatim으로 그대로 적용한다. 스키마를 자체적으로 재생성하지 말 것.
- 파일은 추가만 한다. 기존 파일 수정 금지 (신규 프로젝트이므로 최초 생성 단계는 예외).
- 트리거 함수 `set_updated_at()`, `is_admin()`은 한 번만 정의하고 모든 테이블/정책에서 재사용한다. 동일 로직 재정의 금지.
- 버그 발생 시 임시방편 금지. 8D 방식으로 근본 원인 분석 후 D5(영구 시정) 관점의 코드로 수정한다.
- 모든 PK는 UUID v4 (`gen_random_uuid()`). 모든 테이블에 RLS 적용.
- 중간에 진행 상황을 묻지 말고 끝까지 자율적으로 완료할 것. 완료 후 결과만 보고할 것.
- 명시되지 않은 기능은 추가하지 말 것.

---

## 1. 데이터베이스 마이그레이션 (`supabase/migrations/0001_init.sql`)

```sql
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
```

## 2. Storage 버킷 및 정책 (`supabase/migrations/0002_storage.sql`)

```sql
insert into storage.buckets (id, name, public) values ('files', 'files', false);

create policy storage_files_insert on storage.objects for insert
with check (
  bucket_id = 'files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy storage_files_select on storage.objects for select
using (
  bucket_id = 'files'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.files f
      join public.file_permissions fp on fp.file_id = f.id
      where f.storage_path = name and fp.user_id = auth.uid()
    )
    or public.is_admin()
  )
);

create policy storage_files_delete on storage.objects for delete
using (
  bucket_id = 'files'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
```

업로드 경로 규칙: `{auth.uid()}/{file_id}/{file_name}`. 이 규칙을 벗어난 경로는 삽입 정책에서 자동 거부된다.

## 3. 기능 요구사항

### 3-1. 인증 및 관리자 코드
- `/signup`, `/login`: Supabase Auth email+password
- 가입 시 `profiles` 행 자동 생성 (트리거 또는 Auth 콜백에서 처리)
- `/admin/redeem`: 코드 입력 폼 → `redeem_admin_code(p_code)` RPC 호출 → 성공 시 role='admin'으로 세션 갱신
- 관리자 대시보드에 코드 발급 버튼 → `generate_admin_code()` RPC 호출, 반환된 평문 코드를 1회만 화면에 표시 (재조회 불가함을 안내)

### 3-2. 파일 저장소
- 업로드: Supabase Storage `files` 버킷, 경로 `{uid}/{file_id}/{filename}`, 업로드 후 `files` 테이블에 메타데이터 insert
- 목록: 본인 소유 + 공유받은 파일 + (관리자는 전체)
- 다운로드: signed URL 발급
- 삭제: storage.objects + files 테이블 동시 삭제
- 공유: `file_permissions`에 view/edit 권한 부여 UI

### 3-3. 문서 편집
- Tiptap 에디터, `content` 컬럼은 JSON으로 저장 (HTML 직접 저장 금지 — XSS 방지)
- 생성/조회/수정 CRUD, `document_permissions`으로 공유
- 저장은 디바운스 처리 (수동 저장 버튼 + 자동 저장 둘 다 지원)

## 4. 최초 관리자 부트스트랩
`admin_codes`는 클라이언트에서 삽입 불가하므로, 최초 관리자 코드 1개는 Supabase SQL Editor에서 직접 생성한다:
```sql
select public.generate_admin_code(); -- 단, 최초 실행 시엔 is_admin() 체크를 우회해야 하므로
```
위 함수는 `is_admin()` 체크가 있어 최초엔 실행 불가하다. 최초 1회에 한해 SQL Editor에서 아래처럼 직접 삽입:
```sql
insert into public.admin_codes (code_hash, expires_at)
values (encode(digest('여기에_임의의_평문코드', 'sha256'), 'hex'), null);
```
발급자가 사용한 평문 코드를 별도로 기록해두고 `/admin/redeem`에서 입력한다.

## 5. 완료 조건
- 위 마이그레이션 2개 파일이 그대로 적용되어 있을 것
- 회원가입 → 일반 로그인 → 관리자 코드 입력 → role 승격까지 end-to-end 동작
- 파일 업로드/다운로드/삭제/공유 동작
- 문서 생성/편집/공유 동작
- RLS 우회 경로 없음을 확인 (다른 사용자 소유 데이터에 비인가 접근 불가)
