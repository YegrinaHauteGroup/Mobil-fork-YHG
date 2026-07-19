"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";

const SYSTEM_PROMPT =
  "You are Sophia, the AI assistant built into Mobil (a personal workspace for documents, code, sheets, files and mind maps). Be helpful, concise, and clear.";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** 상태 코드로 "다른 키로 바꿔서 재시도할 가치가 있는지" 판단한다.
 * 401/403 은 키 자체 문제, 429 는 그 키의 레이트리밋, 5xx 는 일시 장애 —
 * 셋 다 두 번째 키로는 성공할 수 있다. 400 같은 요청 자체 오류는 키를
 * 바꿔도 똑같이 실패하므로 재시도하지 않는다. */
function isRetryableStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 429 || status >= 500;
}

/** NVIDIA_API_KEY / NVIDIA_API_KEY_2 두 키를 등록해두면, 매 요청마다 시작
 * 키를 무작위로 섞어 부하를 고르게 나누고(로드밸런싱), 한쪽이 레이트리밋·
 * 장애·키 문제로 실패하면 남은 키로 자동 재시도한다(failover). */
async function callSophiaModel(
  messages: ChatMessage[]
): Promise<{ reply: string } | { error: string }> {
  const keys = [process.env.NVIDIA_API_KEY, process.env.NVIDIA_API_KEY_2].filter(
    (k): k is string => !!k
  );
  if (keys.length === 0) {
    return { error: "Sophia isn't configured yet (missing NVIDIA_API_KEY)." };
  }
  if (keys.length > 1 && Math.random() < 0.5) keys.reverse();

  let lastStatus: number | null = null;

  for (let i = 0; i < keys.length; i++) {
    const isLastKey = i === keys.length - 1;
    try {
      const res = await fetch(NVIDIA_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keys[i]}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: NVIDIA_MODEL,
          messages,
          temperature: 0.2,
          top_p: 0.7,
          max_tokens: 1024,
          stream: false,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const reply = (json?.choices?.[0]?.message?.content ?? "").trim() || "…";
        return { reply };
      }

      lastStatus = res.status;
      const text = await res.text().catch(() => "");
      console.error(
        `[sophia] NVIDIA API error (key ${i + 1}/${keys.length})`,
        res.status,
        text
      );
      if (!isRetryableStatus(res.status) || isLastKey) {
        return { error: `Sophia is unavailable right now (${res.status}).` };
      }
      // 재시도 가치가 있는 오류 + 남은 키가 있음 → 다음 키로 계속.
    } catch (e) {
      console.error(`[sophia] NVIDIA API request failed (key ${i + 1}/${keys.length})`, e);
      if (isLastKey) {
        return { error: "Sophia is unavailable right now." };
      }
    }
  }

  return { error: `Sophia is unavailable right now (${lastStatus ?? "network error"}).` };
}

export type ConversationRow = { id: string; title: string; updated_at: string };
export type MessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export async function listConversations(): Promise<ConversationRow[]> {
  const { userId } = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conversations")
    .select("id, title, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function createConversation(): Promise<
  ConversationRow | { error: string }
> {
  const { userId } = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ owner_id: userId })
    .select("id, title, updated_at")
    .single();
  if (error || !data) return { error: "Failed to start a new chat." };
  return data;
}

export async function getMessages(conversationId: string): Promise<MessageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function deleteConversation(
  conversationId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId);
  if (error) return { error: "Failed to delete chat." };
  return { ok: true };
}

/** 사용자 메시지를 저장하고, NVIDIA(Llama 3.3 70B)에 물어 답변을 받아 저장한다. */
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<{ reply: string } | { error: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { error: "Message is empty." };

  const supabase = await createClient();

  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id, title")
    .eq("id", conversationId)
    .single();
  if (!conv) return { error: "Conversation not found." };

  const { error: userInsertErr } = await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, role: "user", content: trimmed });
  if (userInsertErr) return { error: "Failed to save message." };

  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
  ];

  const result = await callSophiaModel(messages);
  if ("error" in result) return result;
  const reply = result.reply;

  await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, role: "assistant", content: reply });

  // 첫 메시지면 대화 제목을 자동으로 붙인다(항상 title 을 넣어야 updated_at
  // 트리거가 확실히 갱신되어 목록이 최신순으로 재정렬된다).
  const isFirstMessage = (history ?? []).length <= 1;
  const nextTitle =
    isFirstMessage && conv.title === "New chat" ? trimmed.slice(0, 60) : conv.title;
  await supabase
    .from("ai_conversations")
    .update({ title: nextTitle })
    .eq("id", conversationId);

  return { reply };
}
