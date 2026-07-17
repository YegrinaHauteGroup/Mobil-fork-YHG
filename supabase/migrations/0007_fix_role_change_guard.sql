-- ============================================================================
-- 권한 상승 취약점 시정 — role 변경 가드 재설계
-- ----------------------------------------------------------------------------
-- 근본 원인(8D/D4): 0001 의 prevent_role_change 는 `current_user = session_user`
-- 일 때만 role 변경을 차단한다. 그러나 Supabase PostgREST 는 `authenticator` 로
-- 접속 후 `authenticated`/`anon` 으로 SET ROLE 하므로 요청 처리 중에는 항상
-- current_user(authenticated) <> session_user(authenticator) 이다. 즉 이 가드는
-- 실제 앱 요청에서 절대 발동하지 않아, 인증 사용자가
-- `update profiles set role='admin' where id = auth.uid()` 로 자기 자신을
-- 관리자로 승격할 수 있다(profiles_update_own 정책은 컬럼 제한이 없음).
--   → DB 레벨 테스트로 self-promote 성공을 재현하여 확인함.
--
-- 영구 시정(D5): role 변경은 오직 redeem_admin_code(SECURITY DEFINER) 경유로만
-- 허용한다. 트랜잭션 로컬 GUC 플래그(app.allow_role_change='on')를 redeem 이
-- 설정할 때에만 트리거가 통과시킨다. 클라이언트는 PostgREST 를 통해 임의의
-- set_config/GUC 를 설정할 수 없으므로 이 플래그를 위조할 수 없다.
-- ============================================================================

create or replace function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(current_setting('app.allow_role_change', true), '') <> 'on' then
    raise exception 'role_change_not_allowed';
  end if;
  return new;
end;
$$;

-- redeem 함수가 role 변경 직전에만 플래그를 세우도록 재정의
-- (0006 의 search_path = public, extensions 유지)
create or replace function public.redeem_admin_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions
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

  -- 트랜잭션 로컬 플래그를 세운 상태에서만 role 변경 허용
  perform set_config('app.allow_role_change', 'on', true);
  update public.profiles
  set role = 'admin'
  where id = auth.uid();
  perform set_config('app.allow_role_change', 'off', true);
end;
$$;

revoke all on function public.redeem_admin_code(text) from public, anon;
grant execute on function public.redeem_admin_code(text) to authenticated;
