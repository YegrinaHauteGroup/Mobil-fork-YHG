-- ============================================================================
-- 프로필 자동 생성 트리거
-- ----------------------------------------------------------------------------
-- 지시서 3-1: "가입 시 profiles 행 자동 생성 (트리거 또는 Auth 콜백에서 처리)".
--
-- 0001_init.sql 은 profiles 에 SELECT / UPDATE 정책만 두고 INSERT 정책이 없다.
-- 따라서 authenticated 역할(클라이언트/Auth 콜백)로는 RLS 에 막혀 profiles 행을
-- 만들 수 없다. 이는 임시방편(예: 광범위한 INSERT 정책 개방)으로 우회할 문제가
-- 아니라, auth.users INSERT 시점에 SECURITY DEFINER 트리거로 프로필을 생성하는
-- 것이 근본 시정(D5)이다. SECURITY DEFINER 는 RLS 를 우회하며, 신규 가입이라는
-- 단일 경로에서만 실행되므로 공격면을 넓히지 않는다.
--
-- 0001/0002 는 verbatim 유지하고, 본 트리거만 별도 마이그레이션으로 추가한다.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
