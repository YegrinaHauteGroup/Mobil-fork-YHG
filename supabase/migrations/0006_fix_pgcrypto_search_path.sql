-- ============================================================================
-- redeem/generate 관리자 코드 함수의 pgcrypto 해석 오류 시정
-- ----------------------------------------------------------------------------
-- 근본 원인(8D/D4): Supabase 는 pgcrypto 확장(digest, gen_random_bytes)을
-- `extensions` 스키마에 설치한다. 0001 의 redeem_admin_code / generate_admin_code
-- 는 `set search_path = public` 으로 고정되어 있어 이 함수들을 찾지 못하고
-- 런타임에 `function digest(text, unknown) does not exist` 로 실패한다.
-- (gen_random_uuid 는 코어 함수라 영향 없음 → 테이블 기본값은 정상 동작)
--
-- 영구 시정(D5): 두 함수의 search_path 에 `extensions` 를 포함시켜 pgcrypto 를
-- 해석 가능하게 한다. 본문 로직은 0001 과 동일하다. 0001 파일은 verbatim 유지하고
-- 본 마이그레이션에서만 재정의한다. create or replace 는 기존 권한(0005 하드닝)을
-- 보존하지만, 자기완결성을 위해 마지막에 권한을 재확인한다.
-- ============================================================================

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

  update public.profiles
  set role = 'admin'
  where id = auth.uid();
end;
$$;

create or replace function public.generate_admin_code(p_expires_at timestamptz default null)
returns text
language plpgsql
security definer
set search_path = public, extensions
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

-- 권한 재확인 (0005 하드닝 유지: authenticated 만 실행)
revoke all on function public.redeem_admin_code(text) from public, anon;
revoke all on function public.generate_admin_code(timestamptz) from public, anon;
grant execute on function public.redeem_admin_code(text) to authenticated;
grant execute on function public.generate_admin_code(timestamptz) to authenticated;
