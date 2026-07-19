-- ============================================================================
-- 실시간 동시편집 브로드캐스트 채널 접근 통제
-- ----------------------------------------------------------------------------
-- 클라이언트는 `doc:{document_id}` / `code:{code_file_id}` 토픽으로 Supabase
-- Realtime Broadcast 채널을 연다(lib/yjs-transport.ts). 기본(public) 채널은
-- realtime.messages 의 RLS 를 거치지 않고 토픽 이름만 알면 누구나 구독·발신할
-- 수 있다 — UUID 라 추측은 어렵지만, 문서/파일 URL 이 노출되거나 공유가
-- 회수된 뒤에도 실시간 채널로는 계속 주입이 가능해지는 우회로가 남는다.
-- 그래서 채널을 private(config.private = true) 로 열도록 클라이언트를
-- 바꾸고, realtime.messages 에 RLS 정책을 걸어 문서/코드 테이블의 기존
-- view/edit 권한 규칙을 그대로 강제한다.
--
-- 수신(SELECT)은 열람 가능 여부(can_view_object, is_public 포함)로,
-- 발신(INSERT, 즉 브로드캐스트 전송)은 편집 가능 여부로 나눠 검사한다 —
-- 열람 전용 사용자가 브로드캐스트로 가짜 Yjs 업데이트를 주입해 다른 편집자의
-- 클라이언트가 그걸 그대로 저장해버리는 것을 막기 위함이다.
-- ============================================================================

create or replace function public.can_edit_object(p_kind text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if p_kind = 'document' then
    return exists(
      select 1 from public.documents d
      where d.id = p_id
        and (d.owner_id = auth.uid()
             or exists(select 1 from public.document_permissions dp where dp.document_id = d.id and dp.user_id = auth.uid() and dp.permission = 'edit')
             or public.is_admin())
    );
  elsif p_kind = 'code' then
    return exists(
      select 1 from public.code_files c
      where c.id = p_id
        and (c.owner_id = auth.uid()
             or exists(select 1 from public.code_file_permissions cp where cp.code_file_id = c.id and cp.user_id = auth.uid() and cp.permission = 'edit')
             or public.is_admin())
    );
  else
    return false;
  end if;
end;
$$;

revoke all on function public.can_edit_object(text, uuid) from public, anon;
grant execute on function public.can_edit_object(text, uuid) to authenticated;

-- 토픽 문자열(`doc:<uuid>` / `code:<uuid>`)에서 kind/id 를 파싱해 위 두 함수로
-- 위임한다. 형식에 맞지 않는 토픽(다른 기능이 쓰는 채널 등)은 거부한다.
create or replace function public.realtime_topic_viewable(p_topic text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if p_topic like 'doc:%' then
    return public.can_view_object('document', substring(p_topic from 5)::uuid);
  elsif p_topic like 'code:%' then
    return public.can_view_object('code', substring(p_topic from 6)::uuid);
  end if;
  return false;
exception when others then
  return false;
end;
$$;

create or replace function public.realtime_topic_editable(p_topic text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if p_topic like 'doc:%' then
    return public.can_edit_object('document', substring(p_topic from 5)::uuid);
  elsif p_topic like 'code:%' then
    return public.can_edit_object('code', substring(p_topic from 6)::uuid);
  end if;
  return false;
exception when others then
  return false;
end;
$$;

revoke all on function public.realtime_topic_viewable(text) from public, anon;
grant execute on function public.realtime_topic_viewable(text) to authenticated;
revoke all on function public.realtime_topic_editable(text) from public, anon;
grant execute on function public.realtime_topic_editable(text) to authenticated;

drop policy if exists mobil_doc_code_broadcast_select on realtime.messages;
create policy mobil_doc_code_broadcast_select on realtime.messages for select
using (public.realtime_topic_viewable(topic));

drop policy if exists mobil_doc_code_broadcast_insert on realtime.messages;
create policy mobil_doc_code_broadcast_insert on realtime.messages for insert
with check (public.realtime_topic_editable(topic));
