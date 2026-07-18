-- ============================================================================
-- 회원가입 승인제 — 신규 가입자는 admin 승인 전까지 앱을 사용할 수 없다.
-- ----------------------------------------------------------------------------
-- profiles 에 approval_status 를 추가한다. 신규 가입 트리거(handle_new_user,
-- 0003)는 컬럼을 명시하지 않으므로 DEFAULT 'pending' 이 그대로 적용된다.
-- 기존에 이미 활동 중이던 계정까지 갑자기 잠기면 안 되므로, ALTER 직후
-- 한 번만 전체를 'approved' 로 백필한다(이 시점엔 아직 방어 트리거가 없어
-- 일반 UPDATE 로 충분).
--
-- role 승격과 동일한 취약점 계열(0007, D4/D5) — 사용자가 자기 자신의
-- profiles 행을 PATCH 해 approval_status='approved' 로 자가승인하는 것을
-- 막아야 한다. redeem_admin_code 와 동일하게 트랜잭션 로컬 GUC 플래그로
-- 게이트를 건 SECURITY DEFINER 함수(approve_user/reject_user)만 변경을
-- 허용한다.
-- ============================================================================

alter table public.profiles
  add column approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  add column approved_by uuid references public.profiles(id),
  add column approved_at timestamptz;

update public.profiles set approval_status = 'approved', approved_at = now();

create or replace function public.prevent_approval_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.approval_status is distinct from old.approval_status
     and coalesce(current_setting('app.allow_approval_change', true), '') <> 'on' then
    raise exception 'approval_change_not_allowed';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_approval_change
before update on public.profiles
for each row execute function public.prevent_approval_change();

create or replace function public.approve_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  perform set_config('app.allow_approval_change', 'on', true);
  update public.profiles
  set approval_status = 'approved', approved_by = auth.uid(), approved_at = now()
  where id = p_user_id;
  perform set_config('app.allow_approval_change', 'off', true);
end;
$$;

revoke all on function public.approve_user(uuid) from public, anon;
grant execute on function public.approve_user(uuid) to authenticated;

create or replace function public.reject_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  perform set_config('app.allow_approval_change', 'on', true);
  update public.profiles
  set approval_status = 'rejected', approved_by = auth.uid(), approved_at = now()
  where id = p_user_id;
  perform set_config('app.allow_approval_change', 'off', true);
end;
$$;

revoke all on function public.reject_user(uuid) from public, anon;
grant execute on function public.reject_user(uuid) to authenticated;

-- admin 승격 시 승인 상태도 함께 강제한다(승격된 사람이 pending/rejected 로
-- 남아 자기 자신이 잠기는 일이 없도록 방어적으로 처리).
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

  perform set_config('app.allow_role_change', 'on', true);
  perform set_config('app.allow_approval_change', 'on', true);
  update public.profiles
  set role = 'admin',
      approval_status = 'approved',
      approved_at = coalesce(approved_at, now())
  where id = auth.uid();
  perform set_config('app.allow_role_change', 'off', true);
  perform set_config('app.allow_approval_change', 'off', true);
end;
$$;

revoke all on function public.redeem_admin_code(text) from public, anon;
grant execute on function public.redeem_admin_code(text) to authenticated;

-- ---------- 승인 대기/거절 목록 조회(관리자 전용) ----------
create or replace function public.list_users_by_approval(p_status text default 'pending')
returns table(
  id uuid,
  email text,
  display_name text,
  role text,
  approval_status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  return query
    select p.id, p.email, p.display_name, p.role, p.approval_status, p.created_at
    from public.profiles p
    where p_status is null or p.approval_status = p_status
    order by p.created_at desc;
end;
$$;

revoke all on function public.list_users_by_approval(text) from public, anon;
grant execute on function public.list_users_by_approval(text) to authenticated;
