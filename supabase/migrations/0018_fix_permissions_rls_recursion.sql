-- ============================================================================
-- documents/code_files/sheets/mind_maps/files 의 select 정책이 대응
-- *_permissions 테이블을 exists() 로 서브쿼리하고, 그 *_permissions 테이블의
-- select/insert/delete 정책이 다시 소유자 테이블(documents 등)을 exists() 로
-- 서브쿼리하는 상호 순환 구조 때문에 Postgres 가 RLS 정책을 평가하는 시점에
-- "infinite recursion detected in policy for relation ..." 를 던진다.
-- 이로 인해 5개 콘텐츠 테이블에 대한 모든 select/insert(insert 후 반환 포함)가
-- 500 으로 실패한다 — "새 문서/새 코드 파일/파일 업로드/새 시트/새 마인드맵"이
-- 전부 동작하지 않는 근본 원인이다.
--
-- 0017 은 search_ontology 호출 경로만 SECURITY DEFINER 로 우회했을 뿐,
-- 0001/0004/0009/0010 의 *_permissions_select/insert/delete 정책이 소유자
-- 테이블을 직접 서브쿼리하는 구조 자체는 그대로 남겨 두었다(0017 의 "지금까지는
-- 이 순환이 실제로 발동하는 조회 경로가 없었다"는 전제가 틀렸다 — 공유되지
-- 않고 비공개인 행이 하나라도 포함된 목록 조회에서 즉시 발동한다).
--
-- 수정: can_view_object 와 동일한 패턴으로, *_permissions 쪽 정책만 SECURITY
-- DEFINER 헬퍼(테이블 소유자 권한으로 실행되어 그 테이블의 RLS 를 타지 않음)를
-- 통해 소유권을 확인하도록 바꿔 순환 고리를 끊는다. documents_select 등
-- 원본 콘텐츠 테이블의 정책 자체는 건드리지 않는다.
-- ============================================================================

create or replace function public.is_document_owner(p_document_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.documents where id = p_document_id and owner_id = auth.uid()
  );
$$;
revoke all on function public.is_document_owner(uuid) from public, anon;
grant execute on function public.is_document_owner(uuid) to authenticated;

create or replace function public.is_code_file_owner(p_code_file_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.code_files where id = p_code_file_id and owner_id = auth.uid()
  );
$$;
revoke all on function public.is_code_file_owner(uuid) from public, anon;
grant execute on function public.is_code_file_owner(uuid) to authenticated;

create or replace function public.is_sheet_owner(p_sheet_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.sheets where id = p_sheet_id and owner_id = auth.uid()
  );
$$;
revoke all on function public.is_sheet_owner(uuid) from public, anon;
grant execute on function public.is_sheet_owner(uuid) to authenticated;

create or replace function public.is_mind_map_owner(p_mind_map_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.mind_maps where id = p_mind_map_id and owner_id = auth.uid()
  );
$$;
revoke all on function public.is_mind_map_owner(uuid) from public, anon;
grant execute on function public.is_mind_map_owner(uuid) to authenticated;

create or replace function public.is_file_owner(p_file_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.files where id = p_file_id and owner_id = auth.uid()
  );
$$;
revoke all on function public.is_file_owner(uuid) from public, anon;
grant execute on function public.is_file_owner(uuid) to authenticated;

-- ---------- document_permissions ----------
drop policy document_permissions_select on public.document_permissions;
create policy document_permissions_select on public.document_permissions for select
using (
  user_id = auth.uid()
  or public.is_document_owner(document_id)
  or public.is_admin()
);

drop policy document_permissions_insert on public.document_permissions;
create policy document_permissions_insert on public.document_permissions for insert
with check (
  public.is_document_owner(document_id)
  or public.is_admin()
);

drop policy document_permissions_delete on public.document_permissions;
create policy document_permissions_delete on public.document_permissions for delete
using (
  public.is_document_owner(document_id)
  or public.is_admin()
);

-- ---------- code_file_permissions ----------
drop policy code_file_permissions_select on public.code_file_permissions;
create policy code_file_permissions_select on public.code_file_permissions for select
using (
  user_id = auth.uid()
  or public.is_code_file_owner(code_file_id)
  or public.is_admin()
);

drop policy code_file_permissions_insert on public.code_file_permissions;
create policy code_file_permissions_insert on public.code_file_permissions for insert
with check (
  public.is_code_file_owner(code_file_id)
  or public.is_admin()
);

drop policy code_file_permissions_delete on public.code_file_permissions;
create policy code_file_permissions_delete on public.code_file_permissions for delete
using (
  public.is_code_file_owner(code_file_id)
  or public.is_admin()
);

-- ---------- sheet_permissions ----------
drop policy sheet_permissions_select on public.sheet_permissions;
create policy sheet_permissions_select on public.sheet_permissions for select
using (
  user_id = auth.uid()
  or public.is_sheet_owner(sheet_id)
  or public.is_admin()
);

drop policy sheet_permissions_insert on public.sheet_permissions;
create policy sheet_permissions_insert on public.sheet_permissions for insert
with check (
  public.is_sheet_owner(sheet_id)
  or public.is_admin()
);

drop policy sheet_permissions_delete on public.sheet_permissions;
create policy sheet_permissions_delete on public.sheet_permissions for delete
using (
  public.is_sheet_owner(sheet_id)
  or public.is_admin()
);

-- ---------- mind_map_permissions ----------
drop policy mind_map_permissions_select on public.mind_map_permissions;
create policy mind_map_permissions_select on public.mind_map_permissions for select
using (
  user_id = auth.uid()
  or public.is_mind_map_owner(mind_map_id)
  or public.is_admin()
);

drop policy mind_map_permissions_insert on public.mind_map_permissions;
create policy mind_map_permissions_insert on public.mind_map_permissions for insert
with check (
  public.is_mind_map_owner(mind_map_id)
  or public.is_admin()
);

drop policy mind_map_permissions_delete on public.mind_map_permissions;
create policy mind_map_permissions_delete on public.mind_map_permissions for delete
using (
  public.is_mind_map_owner(mind_map_id)
  or public.is_admin()
);

-- ---------- file_permissions ----------
drop policy file_permissions_select on public.file_permissions;
create policy file_permissions_select on public.file_permissions for select
using (
  user_id = auth.uid()
  or public.is_file_owner(file_id)
  or public.is_admin()
);

drop policy file_permissions_insert on public.file_permissions;
create policy file_permissions_insert on public.file_permissions for insert
with check (
  public.is_file_owner(file_id)
  or public.is_admin()
);

drop policy file_permissions_delete on public.file_permissions;
create policy file_permissions_delete on public.file_permissions for delete
using (
  public.is_file_owner(file_id)
  or public.is_admin()
);
