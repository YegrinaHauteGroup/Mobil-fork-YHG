-- ============================================================================
-- Sophia — AI 어시스턴트 채팅 (NVIDIA NIM / Llama 3.3 70B)
-- ----------------------------------------------------------------------------
-- 다른 콘텐츠 테이블과 달리 공유/공개 개념이 없다(순전히 개인 대화). 소유자
-- 본인만 접근 가능하고, 다른 콘텐츠와의 일관성을 위해 관리자 열람만 허용한다
-- (수정/삭제는 본인만).
-- ============================================================================

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_conversations_owner_idx on public.ai_conversations (owner_id, updated_at desc);

create trigger ai_conversations_set_updated_at
before update on public.ai_conversations
for each row execute function public.set_updated_at();

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

create policy ai_conversations_select on public.ai_conversations for select
using (owner_id = auth.uid() or public.is_admin());

create policy ai_conversations_insert on public.ai_conversations for insert
with check (owner_id = auth.uid());

create policy ai_conversations_update on public.ai_conversations for update
using (owner_id = auth.uid());

create policy ai_conversations_delete on public.ai_conversations for delete
using (owner_id = auth.uid());

create policy ai_messages_select on public.ai_messages for select
using (
  exists(select 1 from public.ai_conversations c where c.id = conversation_id and (c.owner_id = auth.uid() or public.is_admin()))
);

create policy ai_messages_insert on public.ai_messages for insert
with check (
  exists(select 1 from public.ai_conversations c where c.id = conversation_id and c.owner_id = auth.uid())
);

create policy ai_messages_delete on public.ai_messages for delete
using (
  exists(select 1 from public.ai_conversations c where c.id = conversation_id and c.owner_id = auth.uid())
);
