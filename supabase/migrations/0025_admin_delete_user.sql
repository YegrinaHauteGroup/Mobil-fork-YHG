-- ============================================================================
-- 관리자 전용: 사용자 계정 삭제
-- ----------------------------------------------------------------------------
-- profiles.id 는 auth.users(id) 를 on delete cascade 로 참조하고(0001), 각
-- 콘텐츠 테이블(documents/code_files/sheets/mind_maps/files 등)도 owner_id 를
-- profiles(id) 에 on delete cascade 로 물려 있다. 따라서 auth.users 행 하나만
-- 지우면 프로필과 그 사용자가 소유한 모든 콘텐츠가 연쇄적으로 삭제된다.
--
-- 클라이언트에는 service_role 키가 없어 Admin API 를 직접 호출할 수 없으므로,
-- 마이그레이션을 적용하는 postgres 롤이 auth.users 에 대한 DELETE 권한을
-- 가진 것을 이용해 SECURITY DEFINER 함수로 감싼다. 관리자 여부 확인과
-- "자기 자신은 삭제 불가" 방어를 함수 내부에서 강제한다.
-- ============================================================================

create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'cannot_delete_self';
  end if;

  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
