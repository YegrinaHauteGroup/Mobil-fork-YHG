-- ============================================================================
-- 확장 프로필: 아바타 + 나이/주소/성별/자기소개/전화번호 + 필드별 공개 설정
-- ----------------------------------------------------------------------------
-- 이름/성별/이메일/자기소개는 항상 공개(co-worker 조회 시 노출), 나이/주소/
-- 전화번호는 각각 *_public 플래그로 본인이 선택해 공개한다. "빈칸 허용 안 함"
-- 은 이 마이그레이션에서 NOT NULL 로 강제하지 않는다 — 이미 존재하는 계정에
-- NOT NULL 을 걸면 즉시 깨지므로, 필수 입력 검증은 설정 화면(저장 액션)에서
-- 처리한다.
--
-- profiles_select 정책은 본인/관리자만 행을 볼 수 있게 되어 있어(0001), 다른
-- 사용자의 프로필을 select 로 직접 열람할 방법이 없다. co-worker 디렉터리를
-- 위해 RLS 를 넓히는 대신(그러면 age/address/phone 등 비공개 컬럼까지 그대로
-- 노출된다), can_view_object 와 동일하게 SECURITY DEFINER 함수
-- (list_coworkers)로 공개 필드만 계산해 반환한다.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy storage_avatars_insert on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy storage_avatars_update on storage.objects for update
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy storage_avatars_delete on storage.objects for delete
using (
  bucket_id = 'avatars'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

alter table public.profiles
  add column avatar_url text,
  add column age smallint check (age is null or (age between 0 and 150)),
  add column address text,
  add column gender text,
  add column bio text,
  add column phone text,
  add column age_public boolean not null default false,
  add column address_public boolean not null default false,
  add column phone_public boolean not null default false;

create or replace function public.list_coworkers()
returns table(
  id uuid,
  display_name text,
  email text,
  role text,
  gender text,
  bio text,
  avatar_url text,
  age smallint,
  address text,
  phone text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.display_name,
    p.email,
    p.role,
    p.gender,
    p.bio,
    p.avatar_url,
    case when p.age_public then p.age else null end,
    case when p.address_public then p.address else null end,
    case when p.phone_public then p.phone else null end
  from public.profiles p
  where p.id <> auth.uid()
    and p.approval_status = 'approved'
  order by coalesce(p.display_name, p.email);
$$;

revoke all on function public.list_coworkers() from public, anon;
grant execute on function public.list_coworkers() to authenticated;
